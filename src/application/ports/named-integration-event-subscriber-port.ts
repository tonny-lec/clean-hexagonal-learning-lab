import type { IntegrationEventSubscriberPort } from './integration-event-subscriber-port.js';

export interface NamedIntegrationEventSubscriberPort extends IntegrationEventSubscriberPort {
  readonly subscriberName: string;
}
