import { describe, expect, it } from 'vitest';
import { InMemoryOrderRepository } from '../src/adapters/in-memory/in-memory-order-repository.js';
import {
  NotFoundApplicationError,
} from '../src/application/errors/application-error.js';
import { OrderAuthorizationPolicy } from '../src/application/policies/order-authorization-policy.js';
import { getOrderSummary } from '../src/application/use-cases/get-order-summary.js';
import { Money } from '../src/domain/money.js';
import { Order } from '../src/domain/order.js';

describe('getOrderSummary', () => {
  it('returns a DTO for an existing order when the actor is allowed to view it', async () => {
    const repository = new InMemoryOrderRepository();
    const order = Order.place('order-1', 'customer-1', [
      { sku: 'BOOK', quantity: 2, unitPrice: Money.fromMinor(1200, 'JPY') },
      { sku: 'PEN', quantity: 1, unitPrice: Money.fromMinor(250, 'JPY') },
    ]);

    await repository.save(order);

    await expect(
      getOrderSummary(
        {
          orderId: 'order-1',
          actor: {
            actorId: 'customer-1-user',
            role: 'customer',
            customerId: 'customer-1',
          },
        },
        {
          orderRepository: repository,
          authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
        },
      ),
    ).resolves.toEqual({
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

    await expect(
      getOrderSummary(
        {
          orderId: 'missing',
          actor: {
            actorId: 'admin-1',
            role: 'admin',
          },
        },
        {
          orderRepository: repository,
          authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundApplicationError);
  });

  it('returns not found when the actor is not allowed to view the order', async () => {
    const repository = new InMemoryOrderRepository();
    const order = Order.place('order-2', 'customer-1', [
      { sku: 'BOOK', quantity: 1, unitPrice: Money.fromMinor(1200, 'JPY') },
    ]);

    await repository.save(order);

    await expect(
      getOrderSummary(
        {
          orderId: 'order-2',
          actor: {
            actorId: 'customer-2-user',
            role: 'customer',
            customerId: 'customer-2',
          },
        },
        {
          orderRepository: repository,
          authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundApplicationError);
  });
});
