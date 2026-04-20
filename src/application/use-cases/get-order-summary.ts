import type { OrderSummaryDto } from '../dto/order-dto.js';
import { NotFoundApplicationError } from '../errors/application-error.js';
import type { OrderRepositoryPort } from '../ports/order-repository-port.js';

export type GetOrderSummaryQuery = {
  orderId: string;
};

export async function getOrderSummary(
  query: GetOrderSummaryQuery,
  dependencies: { orderRepository: OrderRepositoryPort },
): Promise<OrderSummaryDto> {
  const order = await dependencies.orderRepository.findById(query.orderId);

  if (!order) {
    throw new NotFoundApplicationError(`Order not found: ${query.orderId}`);
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
