import type { OrderPlacedEvent } from '../../domain/order.js';
import type { TransactionContext } from './unit-of-work-port.js';

export type OutboxMessage = {
  id: string;
  eventType: OrderPlacedEvent['type'];
  aggregateId: string;
  payload: OrderPlacedEvent;
  occurredAt: string;
  publishedAt: string | null;
};

export interface OutboxPort {
  save(events: OrderPlacedEvent[], transaction?: TransactionContext): Promise<void>;
}
