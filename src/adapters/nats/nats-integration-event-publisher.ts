import type { OrderPlacedIntegrationEvent } from '../../application/integration-events/order-integration-event.js';
import type { IntegrationEventPublisherPort } from '../../application/ports/integration-event-publisher-port.js';
import type { BrokerClient, BrokerPublishMessage } from './broker-client.js';
import { createNatsBrokerClient } from './nats-broker-client.js';

export type NatsEnvelope = BrokerPublishMessage & {
  event: OrderPlacedIntegrationEvent;
};

export class NatsIntegrationEventPublisher implements IntegrationEventPublisherPort {
  readonly publishedEnvelopes: NatsEnvelope[] = [];

  constructor(
    private readonly options: {
      subjectPrefix?: string;
      servers?: string[];
      brokerClientFactory?: () => Promise<BrokerClient>;
    } = {},
  ) {}

  async publish(events: OrderPlacedIntegrationEvent[]): Promise<void> {
    const client = await this.createClient();

    try {
      for (const event of events) {
        const envelope = toNatsEnvelope(event, this.options.subjectPrefix ?? 'events');
        this.publishedEnvelopes.push(envelope);
        await client.publish(envelope);
      }
    } finally {
      await client.close();
    }
  }

  private async createClient(): Promise<BrokerClient> {
    if (this.options.brokerClientFactory) {
      return this.options.brokerClientFactory();
    }

    return createNatsBrokerClient({
      servers: this.options.servers,
      name: 'clean-hexagonal-learning-lab',
    });
  }
}

export function toNatsEnvelope(event: OrderPlacedIntegrationEvent, subjectPrefix = 'events'): NatsEnvelope {
  return {
    subject: `${subjectPrefix}.${event.type}`,
    headers: {
      eventType: event.type,
      schemaVersion: String(event.schemaVersion),
      integrationEventId: event.integrationEventId,
      orderId: event.orderId,
      publisher: 'nats',
      contentType: 'application/json',
    },
    payload: JSON.stringify(event),
    event,
  };
}
