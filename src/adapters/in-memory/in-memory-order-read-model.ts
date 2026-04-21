import type { OrderSummaryDto } from '../../application/dto/order-dto.js';
import type { OrderReadModelPort } from '../../application/ports/order-read-model-port.js';

export class InMemoryOrderReadModel implements OrderReadModelPort {
  private readonly summaries = new Map<string, OrderSummaryDto>();

  async upsert(summary: OrderSummaryDto): Promise<void> {
    this.summaries.set(summary.orderId, summary);
  }

  async findById(orderId: string): Promise<OrderSummaryDto | undefined> {
    return this.summaries.get(orderId);
  }
}
