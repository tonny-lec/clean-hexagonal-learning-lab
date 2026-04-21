import type { OrderPlacedIntegrationEvent } from '../../application/integration-events/order-integration-event.js';
import type { NamedIntegrationEventSubscriberPort } from '../../application/ports/named-integration-event-subscriber-port.js';

export class FailOnceIntegrationEventSubscriber implements NamedIntegrationEventSubscriberPort {
  private failed = false;

  constructor(
    readonly subscriberName: string,
    private readonly inner: NamedIntegrationEventSubscriberPort,
    private readonly errorMessage: string,
  ) {}

  async handle(event: OrderPlacedIntegrationEvent): Promise<void> {
    if (!this.failed) {
      this.failed = true;
      throw new Error(this.errorMessage);
    }

    await this.inner.handle(event);
  }
}
