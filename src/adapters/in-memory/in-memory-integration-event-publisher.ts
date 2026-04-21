import type { IntegrationEventPublisherPort } from '../../application/ports/integration-event-publisher-port.js';
import type { OrderPlacedIntegrationEvent } from '../../application/integration-events/order-integration-event.js';

export class InMemoryIntegrationEventPublisher implements IntegrationEventPublisherPort {
  readonly publishedEvents: OrderPlacedIntegrationEvent[] = [];

  async publish(events: OrderPlacedIntegrationEvent[]): Promise<void> {
    this.publishedEvents.push(...events);
  }
}
