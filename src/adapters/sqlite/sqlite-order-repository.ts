import { DatabaseSync } from 'node:sqlite';
import type { OrderRepositoryPort, StoredOrderRecord } from '../../application/ports/order-repository-port.js';
import { Money } from '../../domain/money.js';
import { Order } from '../../domain/order.js';

export class SqliteOrderRepository implements OrderRepositoryPort {
  private readonly db: DatabaseSync;

  constructor(filename = ':memory:') {
    this.db = new DatabaseSync(filename);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS idempotency_records (
        idempotency_key TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        payment_confirmation_id TEXT,
        FOREIGN KEY(order_id) REFERENCES orders(id)
      );
    `);
  }

  async save(order: Order, options?: { idempotencyKey?: string; paymentConfirmationId?: string }): Promise<void> {
    const payload = JSON.stringify({
      id: order.id,
      customerId: order.customerId,
      lines: order.lines.map((line) => ({
        sku: line.sku,
        quantity: line.quantity,
        unitPrice: line.unitPrice.toJSON(),
      })),
    });

    this.db.prepare(
      `INSERT OR REPLACE INTO orders (id, customer_id, payload_json) VALUES (?, ?, ?)`,
    ).run(order.id, order.customerId, payload);

    if (options?.idempotencyKey) {
      this.db.prepare(
        `INSERT OR REPLACE INTO idempotency_records (idempotency_key, order_id, payment_confirmation_id)
         VALUES (?, ?, ?)`,
      ).run(options.idempotencyKey, order.id, options.paymentConfirmationId ?? null);
    }
  }

  async findById(id: string): Promise<Order | undefined> {
    const row = this.db.prepare(`SELECT payload_json FROM orders WHERE id = ?`).get(id) as
      | { payload_json: string }
      | undefined;

    if (!row) {
      return undefined;
    }

    return this.deserialize(row.payload_json);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<StoredOrderRecord | undefined> {
    const row = this.db.prepare(
      `SELECT o.payload_json, i.payment_confirmation_id
       FROM idempotency_records i
       JOIN orders o ON o.id = i.order_id
       WHERE i.idempotency_key = ?`,
    ).get(idempotencyKey) as { payload_json: string; payment_confirmation_id: string | null } | undefined;

    if (!row) {
      return undefined;
    }

    return {
      order: this.deserialize(row.payload_json),
      paymentConfirmationId: row.payment_confirmation_id ?? undefined,
    };
  }

  private deserialize(payloadJson: string): Order {
    const payload = JSON.parse(payloadJson) as {
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

    return Order.rehydrate(
      payload.id,
      payload.customerId,
      payload.lines.map((line) => ({
        sku: line.sku,
        quantity: line.quantity,
        unitPrice: Money.fromMinor(line.unitPrice.amountInMinor, line.unitPrice.currency),
      })),
    );
  }
}
