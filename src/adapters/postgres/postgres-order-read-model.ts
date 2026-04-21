import type { QueryResult, QueryResultRow } from 'pg';
import type { OrderSummaryDto } from '../../application/dto/order-dto.js';
import type { OrderReadModelPort } from '../../application/ports/order-read-model-port.js';

type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
};

type OrderSummaryRow = {
  order_id: string;
  customer_id: string;
  lines_json: unknown;
  total_amount_json: unknown;
};

export class PostgresOrderReadModel implements OrderReadModelPort {
  constructor(private readonly db: Queryable) {}

  async upsert(summary: OrderSummaryDto): Promise<void> {
    await this.db.query(
      `INSERT INTO order_summaries (order_id, customer_id, lines_json, total_amount_json)
       VALUES ($1, $2, $3::jsonb, $4::jsonb)
       ON CONFLICT (order_id)
       DO UPDATE SET
         customer_id = EXCLUDED.customer_id,
         lines_json = EXCLUDED.lines_json,
         total_amount_json = EXCLUDED.total_amount_json,
         updated_at = NOW()`,
      [summary.orderId, summary.customerId, JSON.stringify(summary.lines), JSON.stringify(summary.totalAmount)],
    );
  }

  async findById(orderId: string): Promise<OrderSummaryDto | undefined> {
    const result = await this.db.query<OrderSummaryRow>(
      `SELECT order_id, customer_id, lines_json, total_amount_json
       FROM order_summaries
       WHERE order_id = $1`,
      [orderId],
    );

    const row = result.rows[0];
    if (!row) return undefined;

    return {
      orderId: row.order_id,
      customerId: row.customer_id,
      lines: typeof row.lines_json === 'string' ? JSON.parse(row.lines_json) : (row.lines_json as OrderSummaryDto['lines']),
      totalAmount:
        typeof row.total_amount_json === 'string'
          ? JSON.parse(row.total_amount_json)
          : (row.total_amount_json as OrderSummaryDto['totalAmount']),
    };
  }
}
