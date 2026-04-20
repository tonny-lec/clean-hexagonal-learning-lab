import type { OrderPlacedEvent } from '../../domain/order.js';

export interface DomainEventPublisherPort {
  publish(events: OrderPlacedEvent[]): Promise<void> | void;
}
