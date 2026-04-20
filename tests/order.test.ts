import { describe, expect, it } from 'vitest';
import { Money } from '../src/domain/money.js';
import { Order } from '../src/domain/order.js';

describe('Order', () => {
  it('calculates the total amount from all lines', () => {
    const order = Order.place('order-1', 'customer-1', [
      { sku: 'BOOK', quantity: 2, unitPrice: Money.fromMinor(1200, 'JPY') },
      { sku: 'PEN', quantity: 3, unitPrice: Money.fromMinor(250, 'JPY') },
    ]);

    expect(order.totalAmount().toJSON()).toEqual({ amountInMinor: 3150, currency: 'JPY' });
  });

  it('rejects order lines with non-positive quantity', () => {
    expect(() =>
      Order.place('order-2', 'customer-1', [
        { sku: 'BOOK', quantity: 0, unitPrice: Money.fromMinor(1200, 'JPY') },
      ]),
    ).toThrow('Order line quantity must be greater than zero.');
  });

  it('records a domain event when an order is placed', () => {
    const order = Order.place('order-3', 'customer-1', [
      { sku: 'BOOK', quantity: 1, unitPrice: Money.fromMinor(1200, 'JPY') },
    ]);

    expect(order.pullDomainEvents()).toEqual([
      {
        type: 'order.placed',
        orderId: 'order-3',
        customerId: 'customer-1',
        totalAmount: { amountInMinor: 1200, currency: 'JPY' },
      },
    ]);
    expect(order.pullDomainEvents()).toEqual([]);
  });
});
