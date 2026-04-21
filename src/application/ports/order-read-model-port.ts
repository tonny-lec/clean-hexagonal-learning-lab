import type { OrderSummaryDto } from '../dto/order-dto.js';

export interface OrderReadModelPort {
  upsert(summary: OrderSummaryDto): Promise<void> | void;
  findById(orderId: string): Promise<OrderSummaryDto | undefined> | OrderSummaryDto | undefined;
}
