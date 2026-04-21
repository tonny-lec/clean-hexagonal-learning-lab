import type { ActorDto } from '../dto/actor-dto.js';
import type { OrderSummaryDto } from '../dto/order-dto.js';
import {
  AuthorizationApplicationError,
  NotFoundApplicationError,
} from '../errors/application-error.js';
import type { OrderReadModelPort } from '../ports/order-read-model-port.js';
import type { OrderAuthorizationPolicy } from '../policies/order-authorization-policy.js';

export type GetOrderSummaryQuery = {
  actor?: ActorDto;
  orderId: string;
};

export async function getOrderSummary(
  query: GetOrderSummaryQuery,
  dependencies: { orderReadModel: OrderReadModelPort; authorizationPolicy?: OrderAuthorizationPolicy },
): Promise<OrderSummaryDto> {
  const order = await dependencies.orderReadModel.findById(query.orderId);

  if (!order) {
    throw new NotFoundApplicationError(`Order not found: ${query.orderId}`);
  }

  try {
    dependencies.authorizationPolicy?.assertCanViewCustomerOrder(query.actor, order.customerId);
  } catch (error) {
    if (error instanceof AuthorizationApplicationError) {
      throw new NotFoundApplicationError(`Order not found: ${query.orderId}`);
    }

    throw error;
  }

  return order;
}
