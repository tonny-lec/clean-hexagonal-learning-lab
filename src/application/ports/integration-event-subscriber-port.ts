import type { OrderPlacedIntegrationEvent } from '../integration-events/order-integration-event.js';

export interface IntegrationEventSubscriberPort {
  handle(event: OrderPlacedIntegrationEvent): Promise<void> | void;
}
