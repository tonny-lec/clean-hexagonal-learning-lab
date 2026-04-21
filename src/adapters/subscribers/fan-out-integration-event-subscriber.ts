import type { IntegrationEventSubscriberPort } from '../../application/ports/integration-event-subscriber-port.js';
import type { OrderPlacedIntegrationEvent } from '../../application/integration-events/order-integration-event.js';

export class FanOutIntegrationEventSubscriber implements IntegrationEventSubscriberPort {
  constructor(private readonly subscribers: IntegrationEventSubscriberPort[]) {}

  async handle(event: OrderPlacedIntegrationEvent): Promise<void> {
    for (const subscriber of this.subscribers) {
      await subscriber.handle(event);
    }
  }
}
