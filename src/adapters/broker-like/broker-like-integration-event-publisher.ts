import type { IntegrationEventPublisherPort } from '../../application/ports/integration-event-publisher-port.js';
import type { OrderPlacedIntegrationEvent } from '../../application/integration-events/order-integration-event.js';

export type BrokerEnvelope = {
  topic: string;
  key: string;
  headers: Record<string, string>;
  event: OrderPlacedIntegrationEvent;
};

export class BrokerLikeIntegrationEventPublisher implements IntegrationEventPublisherPort {
  readonly envelopes: BrokerEnvelope[] = [];

  async publish(events: OrderPlacedIntegrationEvent[]): Promise<void> {
    for (const event of events) {
      this.envelopes.push({
        topic: `orders.${event.type.replace(/^([^.]+)\.([^.]+)/, '$1-$2')}`,
        key: event.orderId,
        headers: {
          schemaVersion: String(event.schemaVersion),
          eventType: event.type,
        },
        event,
      });
    }
  }
}
