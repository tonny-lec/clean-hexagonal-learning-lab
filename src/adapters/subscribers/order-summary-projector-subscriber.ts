import type { OrderSummaryDto } from '../../application/dto/order-dto.js';
import type { OrderPlacedIntegrationEvent } from '../../application/integration-events/order-integration-event.js';
import type { NamedIntegrationEventSubscriberPort } from '../../application/ports/named-integration-event-subscriber-port.js';
import type { OrderReadModelPort } from '../../application/ports/order-read-model-port.js';

export class OrderSummaryProjectorSubscriber implements NamedIntegrationEventSubscriberPort {
  readonly subscriberName = 'order-summary-projector';

  constructor(private readonly orderReadModel: OrderReadModelPort) {}

  async handle(event: OrderPlacedIntegrationEvent): Promise<void> {
    const summary = this.toSummary(event);
    await this.orderReadModel.upsert(summary);
  }

  private toSummary(event: OrderPlacedIntegrationEvent): OrderSummaryDto {
    if (event.type === 'order.placed.v2') {
      return {
        orderId: event.orderId,
        customerId: event.customer.id,
        lines: event.lineItems,
        totalAmount: event.totals,
      };
    }

    return {
      orderId: event.orderId,
      customerId: event.customerId,
      lines: event.lines,
      totalAmount: event.totalAmount,
    };
  }
}
