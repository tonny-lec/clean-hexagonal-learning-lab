import type { DomainEventPublisherPort } from '../../application/ports/domain-event-publisher-port.js';
import type { OrderPlacedEvent } from '../../domain/order.js';

export class InMemoryDomainEventPublisher implements DomainEventPublisherPort {
  readonly publishedEvents: OrderPlacedEvent[] = [];

  publish(events: OrderPlacedEvent[]): void {
    this.publishedEvents.push(...events);
  }
}
