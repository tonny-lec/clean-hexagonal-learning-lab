import type { ActorDto } from '../dto/actor-dto.js';
import type { OrderSummaryDto } from '../dto/order-dto.js';
import {
  AuthorizationApplicationError,
  NotFoundApplicationError,
} from '../errors/application-error.js';
import type { OrderRepositoryPort } from '../ports/order-repository-port.js';
import type { OrderAuthorizationPolicy } from '../policies/order-authorization-policy.js';

export type GetOrderSummaryQuery = {
  actor?: ActorDto;
  orderId: string;
};

export async function getOrderSummary(
  query: GetOrderSummaryQuery,
  dependencies: { orderRepository: OrderRepositoryPort; authorizationPolicy?: OrderAuthorizationPolicy },
): Promise<OrderSummaryDto> {
  const order = await dependencies.orderRepository.findById(query.orderId);

  if (!order) {
    throw new NotFoundApplicationError(`Order not found: ${query.orderId}`);
  }

  try {
    dependencies.authorizationPolicy?.assertCanViewOrder(query.actor, order);
  } catch (error) {
    if (error instanceof AuthorizationApplicationError) {
      throw new NotFoundApplicationError(`Order not found: ${query.orderId}`);
    }

    throw error;
  }

  return {
    orderId: order.id,
    customerId: order.customerId,
    lines: order.lines.map((line) => ({
      sku: line.sku,
      quantity: line.quantity,
      unitPrice: line.unitPrice.toJSON(),
    })),
    totalAmount: order.totalAmount().toJSON(),
  };
}
