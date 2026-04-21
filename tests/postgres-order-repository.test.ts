import { describe, expect, it } from 'vitest';
import { newDb } from 'pg-mem';
import { PostgresOrderRepository } from '../src/adapters/postgres/postgres-order-repository.js';
import { runPostgresMigrations } from '../src/adapters/postgres/run-postgres-migrations.js';
import { Money } from '../src/domain/money.js';
import { Order } from '../src/domain/order.js';

function createRepository() {
  const db = newDb();
  const adapter = db.adapters.createPg();
  const client = new adapter.Client();

  return {
    db,
    client,
    repository: new PostgresOrderRepository(client),
  };
}

async function prepareRepository(client: { connect(): Promise<void>; query(sql: string): Promise<unknown> }) {
  await client.connect();
  await runPostgresMigrations(client);
}

describe('PostgresOrderRepository', () => {
  it('saves and loads orders', async () => {
    const { client, repository } = createRepository();
    await prepareRepository(client);

    const order = Order.rehydrate('order-1', 'customer-1', [
      { sku: 'BOOK', quantity: 2, unitPrice: Money.fromMinor(1200, 'JPY') },
      { sku: 'PEN', quantity: 1, unitPrice: Money.fromMinor(250, 'JPY') },
    ]);

    await repository.save(order);

    expect((await repository.findById('order-1'))?.totalAmount().toJSON()).toEqual({
      amountInMinor: 2650,
      currency: 'JPY',
    });
  });

  it('stores and loads idempotency records', async () => {
    const { client, repository } = createRepository();
    await prepareRepository(client);

    const order = Order.rehydrate('order-2', 'customer-1', [
      { sku: 'BOOK', quantity: 1, unitPrice: Money.fromMinor(1200, 'JPY') },
    ]);

    await repository.save(order, {
      idempotencyKey: 'request-1',
      paymentConfirmationId: 'payment-1',
    });

    await expect(repository.findByIdempotencyKey('request-1')).resolves.toEqual({
      order,
      paymentConfirmationId: 'payment-1',
    });
  });
});
