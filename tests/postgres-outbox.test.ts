import { describe, expect, it } from 'vitest';
import { newDb } from 'pg-mem';
import { PostgresOutbox } from '../src/adapters/postgres/postgres-outbox.js';
import { runPostgresMigrations } from '../src/adapters/postgres/run-postgres-migrations.js';

function createOutbox() {
  const db = newDb();
  const adapter = db.adapters.createPg();
  const client = new adapter.Client();

  return {
    client,
    outbox: new PostgresOutbox(client),
  };
}

async function prepareOutbox(client: { connect(): Promise<void>; query(sql: string): Promise<unknown> }) {
  await client.connect();
  await runPostgresMigrations(client);
}

describe('PostgresOutbox', () => {
  it('stores pending messages and marks them as published', async () => {
    const { client, outbox } = createOutbox();
    await prepareOutbox(client);

    await outbox.save([
      {
        type: 'order.placed',
        orderId: 'order-1',
        customerId: 'customer-1',
        lines: [{ sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
        totalAmount: { amountInMinor: 2650, currency: 'JPY' },
      },
    ]);

    const pending = await outbox.listPending();

    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      eventType: 'order.placed',
      aggregateId: 'order-1',
      payload: {
        type: 'order.placed',
        orderId: 'order-1',
        customerId: 'customer-1',
        totalAmount: { amountInMinor: 2650, currency: 'JPY' },
      },
      publishedAt: null,
    });

    await outbox.markAsPublished([pending[0].id]);
    await expect(outbox.listPending()).resolves.toEqual([]);
  });
});
