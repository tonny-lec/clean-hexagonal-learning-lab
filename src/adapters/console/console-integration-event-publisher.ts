import type { IntegrationEventPublisherPort } from '../../application/ports/integration-event-publisher-port.js';
import type { OrderPlacedIntegrationEvent } from '../../application/integration-events/order-integration-event.js';

export class ConsoleIntegrationEventPublisher implements IntegrationEventPublisherPort {
  async publish(events: OrderPlacedIntegrationEvent[]): Promise<void> {
    for (const event of events) {
      console.log(`[integration-event] ${event.type} ${event.orderId} ${event.integrationEventId}`);
    }
  }
}
