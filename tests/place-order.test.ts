import { describe, expect, it } from 'vitest';
import { placeOrder } from '../src/application/use-cases/place-order.js';
import { InMemoryOrderRepository } from '../src/adapters/in-memory/in-memory-order-repository.js';

const catalog = {
  getUnitPrice(sku: string) {
    if (sku === 'BOOK') return 1200;
    if (sku === 'PEN') return 250;
    throw new Error(`Unknown SKU: ${sku}`);
  },
};

const payments = {
  charge(customerId: string, amount: number) {
    return { customerId, amount, confirmationId: 'payment-1' };
  },
};

describe('placeOrder', () => {
  it('creates an order using ports and returns a summary', async () => {
    const repository = new InMemoryOrderRepository();

    const result = await placeOrder(
      {
        customerId: 'customer-1',
        items: [
          { sku: 'BOOK', quantity: 2 },
          { sku: 'PEN', quantity: 1 },
        ],
      },
      {
        catalog,
        orderRepository: repository,
        paymentGateway: payments,
        idGenerator: () => 'order-1',
      },
    );

    expect(result).toEqual({
      orderId: 'order-1',
      totalAmount: 2650,
      paymentConfirmationId: 'payment-1',
    });

    expect(repository.findById('order-1')?.totalAmount()).toBe(2650);
  });

  it('fails fast when the request has no items', async () => {
    const repository = new InMemoryOrderRepository();

    await expect(
      placeOrder(
        { customerId: 'customer-1', items: [] },
        {
          catalog,
          orderRepository: repository,
          paymentGateway: payments,
          idGenerator: () => 'order-2',
        },
      ),
    ).rejects.toThrow('An order must contain at least one item.');
  });
});
