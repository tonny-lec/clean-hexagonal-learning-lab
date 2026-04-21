import { randomUUID } from 'node:crypto';
import type { QueryResult, QueryResultRow } from 'pg';
import type { OutboxMessage, OutboxPort } from '../../application/ports/outbox-port.js';
import type { TransactionContext } from '../../application/ports/unit-of-work-port.js';
import type { OrderPlacedEvent } from '../../domain/order.js';

type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
};

type OutboxRow = {
  id: string;
  event_type: OrderPlacedEvent['type'];
  aggregate_id: string;
  payload_json: unknown;
  occurred_at: Date | string;
  published_at: Date | string | null;
};

export class PostgresOutbox implements OutboxPort {
  constructor(private readonly db: Queryable) {}

  async save(events: OrderPlacedEvent[], transaction?: TransactionContext): Promise<void> {
    const executor = this.resolveExecutor(transaction);

    for (const event of events) {
      await executor.query(
        `INSERT INTO outbox_messages (id, event_type, aggregate_id, payload_json, occurred_at, published_at)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
        [randomUUID(), event.type, event.orderId, JSON.stringify(event), new Date().toISOString(), null],
      );
    }
  }

  async listPending(batchSize = 100): Promise<OutboxMessage[]> {
    const result = await this.db.query<OutboxRow>(
      `SELECT id, event_type, aggregate_id, payload_json, occurred_at, published_at
       FROM outbox_messages
       WHERE published_at IS NULL
       ORDER BY occurred_at ASC
       LIMIT $1`,
      [batchSize],
    );

    return result.rows.map((row) => this.toMessage(row));
  }

  async markAsPublished(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.db.query(
        `UPDATE outbox_messages
         SET published_at = NOW()
         WHERE id = $1`,
        [id],
      );
    }
  }

  private resolveExecutor(transaction?: TransactionContext): Queryable {
    return (transaction as Queryable | undefined) ?? this.db;
  }

  private toMessage(row: OutboxRow): OutboxMessage {
    const payload = typeof row.payload_json === 'string'
      ? (JSON.parse(row.payload_json) as OrderPlacedEvent)
      : (row.payload_json as OrderPlacedEvent);

    return {
      id: row.id,
      eventType: row.event_type,
      aggregateId: row.aggregate_id,
      payload,
      occurredAt: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : row.occurred_at,
      publishedAt:
        row.published_at == null
          ? null
          : row.published_at instanceof Date
            ? row.published_at.toISOString()
            : row.published_at,
    };
  }
}
