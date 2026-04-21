import type { OutboxMessage, OutboxPort } from '../../application/ports/outbox-port.js';
import type { TransactionContext } from '../../application/ports/unit-of-work-port.js';
import type { OrderPlacedEvent } from '../../domain/order.js';

export class InMemoryOutbox implements OutboxPort {
  readonly messages: OutboxMessage[] = [];

  async save(events: OrderPlacedEvent[], _transaction?: TransactionContext): Promise<void> {
    for (const event of events) {
      this.messages.push({
        id: `${event.orderId}-${event.type}-${this.messages.length + 1}`,
        eventType: event.type,
        aggregateId: event.orderId,
        payload: event,
        occurredAt: new Date().toISOString(),
        publishedAt: null,
      });
    }
  }
}
