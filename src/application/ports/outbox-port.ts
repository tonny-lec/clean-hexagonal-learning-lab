import type { OrderPlacedEvent } from '../../domain/order.js';
import type { TransactionContext } from './unit-of-work-port.js';

export type OutboxMessage = {
  id: string;
  eventType: OrderPlacedEvent['type'];
  aggregateId: string;
  payload: OrderPlacedEvent;
  occurredAt: string;
  publishedAt: string | null;
  retryCount: number;
  lastError: string | null;
  nextAttemptAt: string;
  deadLetteredAt: string | null;
};

export type OutboxFailure = {
  errorMessage: string;
  nextAttemptAt: string | null;
  deadLetteredAt: string | null;
};

export interface OutboxPort {
  save(events: OrderPlacedEvent[], transaction?: TransactionContext): Promise<void>;
  listPending(batchSize?: number, now?: string): Promise<OutboxMessage[]>;
  listDeadLetters(batchSize?: number): Promise<OutboxMessage[]>;
  markAsPublished(ids: string[]): Promise<void>;
  markAsFailed(id: string, failure: OutboxFailure): Promise<void>;
}
