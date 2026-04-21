import { describe, expect, it } from 'vitest';
import { InMemoryOrderReadModel } from '../src/adapters/in-memory/in-memory-order-read-model.js';
import { NotFoundApplicationError } from '../src/application/errors/application-error.js';
import { OrderAuthorizationPolicy } from '../src/application/policies/order-authorization-policy.js';
import { getOrderSummary } from '../src/application/use-cases/get-order-summary.js';
import { Money } from '../src/domain/money.js';

describe('getOrderSummary', () => {
  it('returns a DTO for an existing read-model order when the actor is allowed to view it', async () => {
    const readModel = new InMemoryOrderReadModel();
    await readModel.upsert({
      orderId: 'order-1',
      customerId: 'customer-1',
      lines: [
        { sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } },
        { sku: 'PEN', quantity: 1, unitPrice: { amountInMinor: 250, currency: 'JPY' } },
      ],
      totalAmount: { amountInMinor: 2650, currency: 'JPY' },
    });

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
          orderReadModel: readModel,
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

  it('throws when the order does not exist in the read model', async () => {
    const readModel = new InMemoryOrderReadModel();

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
          orderReadModel: readModel,
          authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundApplicationError);
  });

  it('returns not found when the actor is not allowed to view the read-model order', async () => {
    const readModel = new InMemoryOrderReadModel();
    await readModel.upsert({
      orderId: 'order-2',
      customerId: 'customer-1',
      lines: [],
      totalAmount: { amountInMinor: 1200, currency: 'JPY' },
    });

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
          orderReadModel: readModel,
          authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundApplicationError);
  });
});
