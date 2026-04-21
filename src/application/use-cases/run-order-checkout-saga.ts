import type { ActorDto } from '../dto/actor-dto.js';
import type { MoneyDto } from '../dto/order-dto.js';
import {
  ExternalServiceError,
  InvalidRequestApplicationError,
} from '../errors/application-error.js';
import type { AuditLogPort } from '../ports/audit-log-port.js';
import type { FulfillmentPort } from '../ports/fulfillment-port.js';
import type { ObservabilityPort } from '../ports/observability-port.js';
import type { OrderRepositoryPort } from '../ports/order-repository-port.js';
import type { OutboxPort } from '../ports/outbox-port.js';
import type { PaymentGatewayPort } from '../ports/payment-gateway-port.js';
import type { ProductCatalogPort } from '../ports/product-catalog-port.js';
import type { TelemetryContextInput } from '../ports/telemetry-context.js';
import { createTelemetryContext } from '../ports/telemetry-context.js';
import type { UnitOfWorkPort } from '../ports/unit-of-work-port.js';
import type { OrderAuthorizationPolicy } from '../policies/order-authorization-policy.js';
import { DomainValidationError } from '../../domain/errors.js';
import { Order } from '../../domain/order.js';

export type OrderCheckoutWorkflowStatus = 'completed' | 'compensated' | 'compensation-failed';

export type RunOrderCheckoutSagaCommand = {
  actor?: ActorDto;
  telemetry?: TelemetryContextInput;
  customerId: string;
  items: Array<{
    sku: string;
    quantity: number;
  }>;
  idempotencyKey?: string;
};

export type OrderCheckoutSagaResultDto = {
  orderId: string;
  totalAmount: MoneyDto;
  paymentConfirmationId: string;
  workflowStatus: OrderCheckoutWorkflowStatus;
  fulfillmentConfirmationId?: string;
  compensationConfirmationId?: string;
  fulfillmentError?: string;
  compensationError?: string;
};

export type RunOrderCheckoutSagaDependencies = {
  catalog: ProductCatalogPort;
  orderRepository: OrderRepositoryPort;
  outbox: OutboxPort;
  unitOfWork: UnitOfWorkPort;
  paymentGateway: PaymentGatewayPort;
  fulfillmentService: FulfillmentPort;
  authorizationPolicy?: OrderAuthorizationPolicy;
  observability?: ObservabilityPort;
  auditLog?: AuditLogPort;
  idGenerator: () => string;
};

export async function runOrderCheckoutSaga(
  command: RunOrderCheckoutSagaCommand,
  dependencies: RunOrderCheckoutSagaDependencies,
): Promise<OrderCheckoutSagaResultDto> {
  if (!command.customerId) {
    throw new InvalidRequestApplicationError('customerId is required.');
  }

  const telemetryContext = createTelemetryContext(command.telemetry, { source: 'application.order-checkout-saga' });

  await dependencies.observability?.record('order.checkout.started', {
    customerId: command.customerId,
    idempotencyKey: command.idempotencyKey ?? null,
  }, telemetryContext);

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

    const paymentRequestId = command.idempotencyKey ?? order.id;

    let paymentReceipt;
    try {
      paymentReceipt = await dependencies.paymentGateway.charge(order.customerId, totalAmount, paymentRequestId);
    } catch (cause) {
      throw new ExternalServiceError('Payment gateway failed.', { cause });
    }

    await dependencies.observability?.record('order.checkout.payment.completed', {
      orderId: order.id,
      paymentConfirmationId: paymentReceipt.confirmationId,
    }, telemetryContext);

    let fulfillmentConfirmationId: string;
    try {
      const fulfillmentReceipt = await dependencies.fulfillmentService.request(
        order,
        paymentReceipt.confirmationId,
        paymentRequestId,
      );
      fulfillmentConfirmationId = fulfillmentReceipt.fulfillmentConfirmationId;
    } catch (fulfillmentError) {
      const fulfillmentMessage = fulfillmentError instanceof Error ? fulfillmentError.message : 'unknown-error';

      await dependencies.observability?.record('order.checkout.fulfillment.failed', {
        orderId: order.id,
        paymentConfirmationId: paymentReceipt.confirmationId,
        error: fulfillmentMessage,
      }, telemetryContext);

      const compensationRequestId = `${paymentRequestId}-compensation`;

      try {
        const refundReceipt = await dependencies.paymentGateway.refund(
          paymentReceipt.confirmationId,
          totalAmount,
          compensationRequestId,
        );

        await dependencies.auditLog?.append({
          action: 'order-checkout-compensated',
          aggregateId: order.id,
          payload: {
            paymentConfirmationId: paymentReceipt.confirmationId,
            refundConfirmationId: refundReceipt.refundConfirmationId,
            fulfillmentError: fulfillmentMessage,
          },
          occurredAt: new Date().toISOString(),
        });

        await dependencies.observability?.record('order.checkout.compensated', {
          orderId: order.id,
          paymentConfirmationId: paymentReceipt.confirmationId,
          refundConfirmationId: refundReceipt.refundConfirmationId,
          fulfillmentError: fulfillmentMessage,
        }, telemetryContext);

        return {
          orderId: order.id,
          totalAmount: totalAmount.toJSON(),
          paymentConfirmationId: paymentReceipt.confirmationId,
          workflowStatus: 'compensated',
          compensationConfirmationId: refundReceipt.refundConfirmationId,
          fulfillmentError: fulfillmentMessage,
        };
      } catch (compensationError) {
        const compensationMessage = compensationError instanceof Error ? compensationError.message : 'unknown-error';

        await dependencies.auditLog?.append({
          action: 'order-checkout-compensation-failed',
          aggregateId: order.id,
          payload: {
            paymentConfirmationId: paymentReceipt.confirmationId,
            fulfillmentError: fulfillmentMessage,
            compensationError: compensationMessage,
          },
          occurredAt: new Date().toISOString(),
        });

        await dependencies.observability?.record('order.checkout.compensation.failed', {
          orderId: order.id,
          paymentConfirmationId: paymentReceipt.confirmationId,
          fulfillmentError: fulfillmentMessage,
          compensationError: compensationMessage,
        }, telemetryContext);

        return {
          orderId: order.id,
          totalAmount: totalAmount.toJSON(),
          paymentConfirmationId: paymentReceipt.confirmationId,
          workflowStatus: 'compensation-failed',
          fulfillmentError: fulfillmentMessage,
          compensationError: compensationMessage,
        };
      }
    }

    const domainEvents = order.pullDomainEvents();

    await dependencies.unitOfWork.runInTransaction(async (transaction) => {
      await dependencies.orderRepository.save(
        order,
        {
          idempotencyKey: command.idempotencyKey,
          paymentConfirmationId: paymentReceipt.confirmationId,
        },
        transaction,
      );
      await dependencies.outbox.save(domainEvents, transaction);
    });

    await dependencies.auditLog?.append({
      action: 'order-checkout-completed',
      aggregateId: order.id,
      payload: {
        paymentConfirmationId: paymentReceipt.confirmationId,
        fulfillmentConfirmationId,
      },
      occurredAt: new Date().toISOString(),
    });

    await dependencies.observability?.record('order.checkout.completed', {
      orderId: order.id,
      paymentConfirmationId: paymentReceipt.confirmationId,
      fulfillmentConfirmationId,
    }, telemetryContext);

    return {
      orderId: order.id,
      totalAmount: totalAmount.toJSON(),
      paymentConfirmationId: paymentReceipt.confirmationId,
      fulfillmentConfirmationId,
      workflowStatus: 'completed',
    };
  } catch (error) {
    await dependencies.observability?.record('order.checkout.failed', {
      customerId: command.customerId,
      error: error instanceof Error ? error.message : 'unknown-error',
    }, telemetryContext);

    if (error instanceof DomainValidationError || error instanceof InvalidRequestApplicationError) {
      throw new InvalidRequestApplicationError(error.message, { cause: error });
    }

    throw error;
  }
}
