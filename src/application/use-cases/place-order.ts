import type { PlaceOrderResultDto } from '../dto/order-dto.js';
import {
  ExternalServiceError,
  InvalidRequestApplicationError,
} from '../errors/application-error.js';
import type { DomainEventPublisherPort } from '../ports/domain-event-publisher-port.js';
import type { OrderRepositoryPort } from '../ports/order-repository-port.js';
import type { PaymentGatewayPort } from '../ports/payment-gateway-port.js';
import type { ProductCatalogPort } from '../ports/product-catalog-port.js';
import type { UnitOfWorkPort } from '../ports/unit-of-work-port.js';
import { DomainValidationError } from '../../domain/errors.js';
import { Order } from '../../domain/order.js';

export type PlaceOrderCommand = {
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
  eventPublisher: DomainEventPublisherPort;
  unitOfWork: UnitOfWorkPort;
  idGenerator: () => string;
};

export async function placeOrder(
  command: PlaceOrderCommand,
  dependencies: PlaceOrderDependencies,
): Promise<PlaceOrderResultDto> {
  if (!command.customerId) {
    throw new InvalidRequestApplicationError('customerId is required.');
  }

  if (command.idempotencyKey && dependencies.orderRepository.findByIdempotencyKey) {
    const existingRecord = await dependencies.orderRepository.findByIdempotencyKey(command.idempotencyKey);
    if (existingRecord) {
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

    await dependencies.unitOfWork.runInTransaction(async () => {
      await dependencies.orderRepository.save(order, {
        idempotencyKey: command.idempotencyKey,
        paymentConfirmationId,
      });
    });

    await dependencies.eventPublisher.publish(order.pullDomainEvents());

    return {
      orderId: order.id,
      totalAmount: totalAmount.toJSON(),
      paymentConfirmationId,
    };
  } catch (error) {
    if (error instanceof DomainValidationError || error instanceof InvalidRequestApplicationError) {
      throw new InvalidRequestApplicationError(error.message, { cause: error });
    }

    throw error;
  }
}
