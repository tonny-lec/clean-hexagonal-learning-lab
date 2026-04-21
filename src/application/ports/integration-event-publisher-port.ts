import type { OrderPlacedIntegrationEvent } from '../integration-events/order-integration-event.js';

export interface IntegrationEventPublisherPort {
  publish(events: OrderPlacedIntegrationEvent[]): Promise<void> | void;
}
