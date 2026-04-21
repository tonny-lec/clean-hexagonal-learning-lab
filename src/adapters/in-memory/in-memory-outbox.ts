import type { OutboxFailure, OutboxMessage, OutboxPort } from '../../application/ports/outbox-port.js';
import type { TransactionContext } from '../../application/ports/unit-of-work-port.js';
import type { OrderPlacedEvent } from '../../domain/order.js';

export class InMemoryOutbox implements OutboxPort {
  readonly messages: OutboxMessage[] = [];

  async save(events: OrderPlacedEvent[], _transaction?: TransactionContext): Promise<void> {
    for (const event of events) {
      const occurredAt = new Date().toISOString();
      this.messages.push({
        id: `${event.orderId}-${event.type}-${this.messages.length + 1}`,
        eventType: event.type,
        aggregateId: event.orderId,
        payload: event,
        occurredAt,
        publishedAt: null,
        retryCount: 0,
        lastError: null,
        nextAttemptAt: occurredAt,
        deadLetteredAt: null,
      });
    }
  }

  async listPending(batchSize?: number, now?: string): Promise<OutboxMessage[]> {
    const cutoff = now ?? new Date().toISOString();
    const pending = this.messages.filter((message) => (
      message.publishedAt == null
      && message.deadLetteredAt == null
      && message.nextAttemptAt <= cutoff
    ));
    return batchSize == null ? pending : pending.slice(0, batchSize);
  }

  async listDeadLetters(batchSize?: number): Promise<OutboxMessage[]> {
    const deadLetters = this.messages.filter((message) => message.deadLetteredAt != null);
    return batchSize == null ? deadLetters : deadLetters.slice(0, batchSize);
  }

  async markAsPublished(ids: string[]): Promise<void> {
    const publishedAt = new Date().toISOString();
    for (const message of this.messages) {
      if (ids.includes(message.id)) {
        message.publishedAt = publishedAt;
      }
    }
  }

  async markAsFailed(id: string, failure: OutboxFailure): Promise<void> {
    const message = this.messages.find((candidate) => candidate.id === id);
    if (!message) return;

    message.retryCount += 1;
    message.lastError = failure.errorMessage;
    message.nextAttemptAt = failure.nextAttemptAt ?? message.nextAttemptAt;
    message.deadLetteredAt = failure.deadLetteredAt;
  }
}
