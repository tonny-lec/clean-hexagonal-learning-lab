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

async function prepareOutbox(client: { connect(): Promise<void>; query(sql: string, params?: unknown[]): Promise<unknown> }) {
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
      retryCount: 0,
      lastError: null,
      deadLetteredAt: null,
      publishedAt: null,
    });

    await outbox.markAsPublished([pending[0].id]);
    await expect(outbox.listPending()).resolves.toEqual([]);
  });

  it('tracks retry metadata and excludes dead-lettered rows from pending delivery', async () => {
    const { client, outbox } = createOutbox();
    await prepareOutbox(client);

    await outbox.save([
      {
        type: 'order.placed',
        orderId: 'order-retry',
        customerId: 'customer-1',
        lines: [{ sku: 'BOOK', quantity: 1, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
        totalAmount: { amountInMinor: 1200, currency: 'JPY' },
      },
    ]);

    const [message] = await outbox.listPending(10, '2030-01-01T00:00:00.000Z');
    await outbox.markAsFailed(message.id, {
      errorMessage: 'simulated publish failure',
      nextAttemptAt: '2030-01-01T00:05:00.000Z',
      deadLetteredAt: null,
    });

    expect(await outbox.listPending(10, '2030-01-01T00:03:00.000Z')).toEqual([]);

    const retryable = await outbox.listPending(10, '2030-01-01T00:05:01.000Z');
    expect(retryable).toHaveLength(1);
    expect(retryable[0]).toMatchObject({
      retryCount: 1,
      lastError: 'simulated publish failure',
      nextAttemptAt: '2030-01-01T00:05:00.000Z',
      deadLetteredAt: null,
    });

    await outbox.markAsFailed(retryable[0].id, {
      errorMessage: 'still failing',
      nextAttemptAt: null,
      deadLetteredAt: '2030-01-01T00:05:01.000Z',
    });

    expect(await outbox.listPending(10, '2030-01-01T01:00:00.000Z')).toEqual([]);

    const deadLetters = await outbox.listDeadLetters();
    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0]).toMatchObject({
      retryCount: 2,
      lastError: 'still failing',
      deadLetteredAt: '2030-01-01T00:05:01.000Z',
    });
  });
});
