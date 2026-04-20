import { describe, expect, it } from 'vitest';
import { InMemoryOrderRepository } from '../src/adapters/in-memory/in-memory-order-repository.js';
import { getOrderSummary } from '../src/application/use-cases/get-order-summary.js';
import { NotFoundApplicationError } from '../src/application/errors/application-error.js';
import { Money } from '../src/domain/money.js';
import { Order } from '../src/domain/order.js';

describe('getOrderSummary', () => {
  it('returns a DTO for an existing order', async () => {
    const repository = new InMemoryOrderRepository();
    const order = Order.place('order-1', 'customer-1', [
      { sku: 'BOOK', quantity: 2, unitPrice: Money.fromMinor(1200, 'JPY') },
      { sku: 'PEN', quantity: 1, unitPrice: Money.fromMinor(250, 'JPY') },
    ]);

    await repository.save(order);

    await expect(getOrderSummary({ orderId: 'order-1' }, { orderRepository: repository })).resolves.toEqual({
      orderId: 'order-1',
      customerId: 'customer-1',
      lines: [
        { sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } },
        { sku: 'PEN', quantity: 1, unitPrice: { amountInMinor: 250, currency: 'JPY' } },
      ],
      totalAmount: { amountInMinor: 2650, currency: 'JPY' },
    });
  });

  it('throws when the order does not exist', async () => {
    const repository = new InMemoryOrderRepository();

    await expect(getOrderSummary({ orderId: 'missing' }, { orderRepository: repository })).rejects.toBeInstanceOf(
      NotFoundApplicationError,
    );
  });
});
