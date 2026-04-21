import type { QueryResult, QueryResultRow } from 'pg';
import type { OrderRepositoryPort, StoredOrderRecord } from '../../application/ports/order-repository-port.js';
import type { TransactionContext } from '../../application/ports/unit-of-work-port.js';
import { Money } from '../../domain/money.js';
import { Order } from '../../domain/order.js';

type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
};

type StoredOrderPayload = {
  id: string;
  customerId: string;
  lines: Array<{
    sku: string;
    quantity: number;
    unitPrice: {
      amountInMinor: number;
      currency: string;
    };
  }>;
};

export class PostgresOrderRepository implements OrderRepositoryPort {
  constructor(private readonly db: Queryable) {}

  async save(
    order: Order,
    options?: { idempotencyKey?: string; paymentConfirmationId?: string },
    transaction?: TransactionContext,
  ): Promise<void> {
    const executor = this.resolveExecutor(transaction);
    const payload: StoredOrderPayload = {
      id: order.id,
      customerId: order.customerId,
      lines: order.lines.map((line) => ({
        sku: line.sku,
        quantity: line.quantity,
        unitPrice: line.unitPrice.toJSON(),
      })),
    };

    await executor.query(
      `INSERT INTO orders (id, customer_id, payload_json)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (id)
       DO UPDATE SET
         customer_id = EXCLUDED.customer_id,
         payload_json = EXCLUDED.payload_json,
         updated_at = NOW()`,
      [order.id, order.customerId, JSON.stringify(payload)],
    );

    if (options?.idempotencyKey) {
      await executor.query(
        `INSERT INTO idempotency_records (idempotency_key, order_id, payment_confirmation_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (idempotency_key)
         DO UPDATE SET
           order_id = EXCLUDED.order_id,
           payment_confirmation_id = EXCLUDED.payment_confirmation_id`,
        [options.idempotencyKey, order.id, options.paymentConfirmationId ?? null],
      );
    }
  }

  async findById(id: string): Promise<Order | undefined> {
    const result = await this.db.query<{ payload_json: unknown }>(
      `SELECT payload_json FROM orders WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    if (!row) return undefined;
    return this.deserialize(row.payload_json);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<StoredOrderRecord | undefined> {
    const result = await this.db.query<{ payload_json: unknown; payment_confirmation_id: string | null }>(
      `SELECT o.payload_json, i.payment_confirmation_id
       FROM idempotency_records i
       JOIN orders o ON o.id = i.order_id
       WHERE i.idempotency_key = $1`,
      [idempotencyKey],
    );

    const row = result.rows[0];
    if (!row) return undefined;

    return {
      order: this.deserialize(row.payload_json),
      paymentConfirmationId: row.payment_confirmation_id ?? undefined,
    };
  }

  private resolveExecutor(transaction?: TransactionContext): Queryable {
    return (transaction as Queryable | undefined) ?? this.db;
  }

  private deserialize(payload: unknown): Order {
    const parsed = typeof payload === 'string' ? (JSON.parse(payload) as StoredOrderPayload) : (payload as StoredOrderPayload);

    return Order.rehydrate(
      parsed.id,
      parsed.customerId,
      parsed.lines.map((line) => ({
        sku: line.sku,
        quantity: line.quantity,
        unitPrice: Money.fromMinor(line.unitPrice.amountInMinor, line.unitPrice.currency),
      })),
    );
  }
}
