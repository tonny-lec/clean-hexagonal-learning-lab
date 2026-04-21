import { describe, expect, it } from 'vitest';
import { AuthorizationApplicationError } from '../src/application/errors/application-error.js';
import { OrderAuthorizationPolicy } from '../src/application/policies/order-authorization-policy.js';
import { Money } from '../src/domain/money.js';
import { Order } from '../src/domain/order.js';

const policy = new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') });

describe('OrderAuthorizationPolicy', () => {
  it('allows admins to view any order', () => {
    const order = Order.rehydrate('order-1', 'customer-1', [
      { sku: 'BOOK', quantity: 1, unitPrice: Money.fromMinor(1200, 'JPY') },
    ]);

    expect(() =>
      policy.assertCanViewOrder(
        {
          actorId: 'admin-1',
          role: 'admin',
        },
        order,
      ),
    ).not.toThrow();
  });

  it('prevents a customer from viewing another customer order', () => {
    const order = Order.rehydrate('order-1', 'customer-1', [
      { sku: 'BOOK', quantity: 1, unitPrice: Money.fromMinor(1200, 'JPY') },
    ]);

    expect(() =>
      policy.assertCanViewOrder(
        {
          actorId: 'customer-2-user',
          role: 'customer',
          customerId: 'customer-2',
        },
        order,
      ),
    ).toThrow(AuthorizationApplicationError);
  });

  it('requires a privileged actor for high-value orders', () => {
    expect(() =>
      policy.assertCanPlaceOrder({
        actor: {
          actorId: 'customer-1-user',
          role: 'customer',
          customerId: 'customer-1',
        },
        customerId: 'customer-1',
        totalAmount: Money.fromMinor(6000, 'JPY'),
      }),
    ).toThrow(AuthorizationApplicationError);
  });
});
