import type { PlaceOrderResultDto } from '../dto/order-dto.js';
import type { ActorDto } from '../dto/actor-dto.js';
import {
  ExternalServiceError,
  InvalidRequestApplicationError,
} from '../errors/application-error.js';
import type { AuditLogPort } from '../ports/audit-log-port.js';
import type { OrderRepositoryPort } from '../ports/order-repository-port.js';
import type { OutboxPort } from '../ports/outbox-port.js';
import type { PaymentGatewayPort } from '../ports/payment-gateway-port.js';
import type { ProductCatalogPort } from '../ports/product-catalog-port.js';
import type { UnitOfWorkPort } from '../ports/unit-of-work-port.js';
import type { ObservabilityPort } from '../ports/observability-port.js';
import type { OrderAuthorizationPolicy } from '../policies/order-authorization-policy.js';
import { DomainValidationError } from '../../domain/errors.js';
import { Order } from '../../domain/order.js';

export type PlaceOrderCommand = {
  actor?: ActorDto;
  customerId: string;
  items: Array<{
    sku: string;
    quantity: number;
  }>;
  idempotencyKey?: string;
};

export type PlaceOrderDependencies = {
  catalog: ProductCatalogPort;
  orderRepository: OrderRepositoryPort;
  paymentGateway: PaymentGatewayPort;
  outbox: OutboxPort;
  unitOfWork: UnitOfWorkPort;
  authorizationPolicy?: OrderAuthorizationPolicy;
  observability?: ObservabilityPort;
  auditLog?: AuditLogPort;
  idGenerator: () => string;
};

export async function placeOrder(
  command: PlaceOrderCommand,
  dependencies: PlaceOrderDependencies,
): Promise<PlaceOrderResultDto> {
  if (!command.customerId) {
    throw new InvalidRequestApplicationError('customerId is required.');
  }

  await dependencies.observability?.record('order.place.started', {
    customerId: command.customerId,
    idempotencyKey: command.idempotencyKey ?? null,
  });

  if (command.idempotencyKey && dependencies.orderRepository.findByIdempotencyKey) {
    const existingRecord = await dependencies.orderRepository.findByIdempotencyKey(command.idempotencyKey);
    if (existingRecord) {
      dependencies.authorizationPolicy?.assertCanPlaceOrder({
        actor: command.actor,
        customerId: existingRecord.order.customerId,
        totalAmount: existingRecord.order.totalAmount(),
      });

      await dependencies.observability?.record('order.place.completed', {
        orderId: existingRecord.order.id,
        reused: true,
      });

      return {
        orderId: existingRecord.order.id,
        totalAmount: existingRecord.order.totalAmount().toJSON(),
        paymentConfirmationId: existingRecord.paymentConfirmationId ?? `reused-${command.idempotencyKey}`,
      };
    }
  }

  try {
    const lines = await Promise.all(
      command.items.map(async (item) => ({
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: await dependencies.catalog.getUnitPrice(item.sku),
      })),
    );

    const order = Order.place(dependencies.idGenerator(), command.customerId, lines);
    const totalAmount = order.totalAmount();

    dependencies.authorizationPolicy?.assertCanPlaceOrder({
      actor: command.actor,
      customerId: order.customerId,
      totalAmount,
    });

    let paymentConfirmationId = '';
    try {
      const payment = await dependencies.paymentGateway.charge(
        order.customerId,
        totalAmount,
        command.idempotencyKey ?? order.id,
      );
      paymentConfirmationId = payment.confirmationId;
    } catch (cause) {
      throw new ExternalServiceError('Payment gateway failed.', { cause });
    }

    const domainEvents = order.pullDomainEvents();

    await dependencies.unitOfWork.runInTransaction(async (transaction) => {
      await dependencies.orderRepository.save(
        order,
        {
          idempotencyKey: command.idempotencyKey,
          paymentConfirmationId,
        },
        transaction,
      );
      await dependencies.outbox.save(domainEvents, transaction);
    });

    await dependencies.auditLog?.append({
      action: 'order-placed',
      aggregateId: order.id,
      payload: {
        customerId: order.customerId,
        paymentConfirmationId,
      },
      occurredAt: new Date().toISOString(),
    });
    await dependencies.observability?.record('order.place.completed', {
      orderId: order.id,
      reused: false,
    });

    return {
      orderId: order.id,
      totalAmount: totalAmount.toJSON(),
      paymentConfirmationId,
    };
  } catch (error) {
    await dependencies.observability?.record('order.place.failed', {
      customerId: command.customerId,
      error: error instanceof Error ? error.message : 'unknown-error',
    });

    if (error instanceof DomainValidationError || error instanceof InvalidRequestApplicationError) {
      throw new InvalidRequestApplicationError(error.message, { cause: error });
    }

    throw error;
  }
}
