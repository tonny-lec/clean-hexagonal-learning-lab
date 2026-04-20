import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { SqliteOrderRepository } from '../src/adapters/sqlite/sqlite-order-repository.js';
import { Money } from '../src/domain/money.js';
import { Order } from '../src/domain/order.js';

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('SqliteOrderRepository', () => {
  it('saves and loads orders with an idempotency key', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'clean-hex-lab-'));
    directories.push(directory);
    const repository = new SqliteOrderRepository(join(directory, 'orders.db'));
    const order = Order.place('order-1', 'customer-1', [
      { sku: 'BOOK', quantity: 2, unitPrice: Money.fromMinor(1200, 'JPY') },
    ]);

    await repository.save(order, { idempotencyKey: 'request-1' });

    expect((await repository.findById('order-1'))?.totalAmount().toJSON()).toEqual({
      amountInMinor: 2400,
      currency: 'JPY',
    });
    expect(await repository.findByIdempotencyKey('request-1')).toBeDefined();
  });
});
