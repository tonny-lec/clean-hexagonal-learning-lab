import { describe, expect, it } from 'vitest';
import { Order } from '../src/domain/order.js';

describe('Order', () => {
  it('calculates the total amount from all lines', () => {
    const order = new Order('order-1', 'customer-1', [
      { sku: 'BOOK', quantity: 2, unitPrice: 1200 },
      { sku: 'PEN', quantity: 3, unitPrice: 250 },
    ]);

    expect(order.totalAmount()).toBe(3150);
  });

  it('rejects order lines with non-positive quantity', () => {
    expect(() =>
      new Order('order-2', 'customer-1', [{ sku: 'BOOK', quantity: 0, unitPrice: 1200 }]),
    ).toThrow('Order line quantity must be greater than zero.');
  });
});
