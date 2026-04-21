import { randomUUID } from 'node:crypto';
import type { QueryResult, QueryResultRow } from 'pg';
import type { OutboxFailure, OutboxMessage, OutboxPort } from '../../application/ports/outbox-port.js';
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
  retry_count: number;
  last_error: string | null;
  next_attempt_at: Date | string;
  dead_lettered_at: Date | string | null;
};

export class PostgresOutbox implements OutboxPort {
  constructor(private readonly db: Queryable) {}

  async save(events: OrderPlacedEvent[], transaction?: TransactionContext): Promise<void> {
    const executor = this.resolveExecutor(transaction);

    for (const event of events) {
      const occurredAt = new Date().toISOString();
      await executor.query(
        `INSERT INTO outbox_messages (
           id,
           event_type,
           aggregate_id,
           payload_json,
           occurred_at,
           published_at,
           retry_count,
           last_error,
           next_attempt_at,
           dead_lettered_at
         )
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)`,
        [randomUUID(), event.type, event.orderId, JSON.stringify(event), occurredAt, null, 0, null, occurredAt, null],
      );
    }
  }

  async listPending(batchSize = 100, now = new Date().toISOString()): Promise<OutboxMessage[]> {
    const result = await this.db.query<OutboxRow>(
      `SELECT id, event_type, aggregate_id, payload_json, occurred_at, published_at,
              retry_count, last_error, next_attempt_at, dead_lettered_at
       FROM outbox_messages
       WHERE published_at IS NULL
         AND dead_lettered_at IS NULL
         AND next_attempt_at <= $2
       ORDER BY next_attempt_at ASC, occurred_at ASC
       LIMIT $1`,
      [batchSize, now],
    );

    return result.rows.map((row) => this.toMessage(row));
  }

  async listDeadLetters(batchSize = 100): Promise<OutboxMessage[]> {
    const result = await this.db.query<OutboxRow>(
      `SELECT id, event_type, aggregate_id, payload_json, occurred_at, published_at,
              retry_count, last_error, next_attempt_at, dead_lettered_at
       FROM outbox_messages
       WHERE dead_lettered_at IS NOT NULL
       ORDER BY dead_lettered_at ASC
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

  async markAsFailed(id: string, failure: OutboxFailure): Promise<void> {
    await this.db.query(
      `UPDATE outbox_messages
       SET retry_count = retry_count + 1,
           last_error = $2,
           next_attempt_at = COALESCE($3, next_attempt_at),
           dead_lettered_at = $4
       WHERE id = $1`,
      [id, failure.errorMessage, failure.nextAttemptAt, failure.deadLetteredAt],
    );
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
      retryCount: row.retry_count,
      lastError: row.last_error,
      nextAttemptAt: row.next_attempt_at instanceof Date ? row.next_attempt_at.toISOString() : row.next_attempt_at,
      deadLetteredAt:
        row.dead_lettered_at == null
          ? null
          : row.dead_lettered_at instanceof Date
            ? row.dead_lettered_at.toISOString()
            : row.dead_lettered_at,
    };
  }
}
