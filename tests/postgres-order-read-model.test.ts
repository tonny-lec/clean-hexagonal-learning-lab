import { describe, expect, it } from 'vitest';
import { newDb } from 'pg-mem';
import { PostgresOrderReadModel } from '../src/adapters/postgres/postgres-order-read-model.js';
import { runPostgresMigrations } from '../src/adapters/postgres/run-postgres-migrations.js';

describe('PostgresOrderReadModel', () => {
  it('stores and loads query-side order summaries', async () => {
    const db = newDb();
    const adapter = db.adapters.createPg();
    const client = new adapter.Client();
    await client.connect();
    await runPostgresMigrations(client);

    const readModel = new PostgresOrderReadModel(client);

    await readModel.upsert({
      orderId: 'order-1',
      customerId: 'customer-1',
      lines: [],
      totalAmount: { amountInMinor: 2650, currency: 'JPY' },
    });

    await expect(readModel.findById('order-1')).resolves.toEqual({
      orderId: 'order-1',
      customerId: 'customer-1',
      lines: [],
      totalAmount: { amountInMinor: 2650, currency: 'JPY' },
    });
  });
});
