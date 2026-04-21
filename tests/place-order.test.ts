import { describe, expect, it } from 'vitest';
import { InMemoryOrderRepository } from '../src/adapters/in-memory/in-memory-order-repository.js';
import { InMemoryOutbox } from '../src/adapters/in-memory/in-memory-outbox.js';
import { NoopUnitOfWork } from '../src/adapters/in-memory/noop-unit-of-work.js';
import {
  AuthorizationApplicationError,
  ExternalServiceError,
} from '../src/application/errors/application-error.js';
import { OrderAuthorizationPolicy } from '../src/application/policies/order-authorization-policy.js';
import { placeOrder } from '../src/application/use-cases/place-order.js';
import { Money } from '../src/domain/money.js';

const catalog = {
  async getUnitPrice(sku: string) {
    if (sku === 'BOOK') return Money.fromMinor(1200, 'JPY');
    if (sku === 'PEN') return Money.fromMinor(250, 'JPY');
    throw new Error(`Unknown SKU: ${sku}`);
  },
};

describe('placeOrder', () => {
  it('creates an order and stores its domain event in the outbox', async () => {
    const repository = new InMemoryOrderRepository();
    const outbox = new InMemoryOutbox();

    const result = await placeOrder(
      {
        actor: {
          actorId: 'customer-1-user',
          role: 'customer',
          customerId: 'customer-1',
        },
        customerId: 'customer-1',
        items: [
          { sku: 'BOOK', quantity: 2 },
          { sku: 'PEN', quantity: 1 },
        ],
        idempotencyKey: 'request-1',
      },
      {
        catalog,
        orderRepository: repository,
        paymentGateway: {
          async charge(customerId, amount) {
            return { customerId, amount: amount.toJSON(), confirmationId: 'payment-1' };
          },
          async refund(paymentConfirmationId, amount) {
            return { paymentConfirmationId, amount: amount.toJSON(), refundConfirmationId: 'refund-1' };
          },
        },
        outbox,
        unitOfWork: new NoopUnitOfWork(),
        authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
        idGenerator: () => 'order-1',
      },
    );

    expect(result).toEqual({
      orderId: 'order-1',
      totalAmount: { amountInMinor: 2650, currency: 'JPY' },
      paymentConfirmationId: 'payment-1',
    });

    expect((await repository.findById('order-1'))?.totalAmount().toJSON()).toEqual({
      amountInMinor: 2650,
      currency: 'JPY',
    });
    expect(outbox.messages).toHaveLength(1);
    expect(outbox.messages[0]).toMatchObject({
      eventType: 'order.placed',
      aggregateId: 'order-1',
      payload: {
        type: 'order.placed',
        orderId: 'order-1',
        customerId: 'customer-1',
        lines: [
          { sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } },
          { sku: 'PEN', quantity: 1, unitPrice: { amountInMinor: 250, currency: 'JPY' } },
        ],
        totalAmount: { amountInMinor: 2650, currency: 'JPY' },
      },
    });
  });

  it('returns the existing order for the same idempotency key', async () => {
    const repository = new InMemoryOrderRepository();
    const outbox = new InMemoryOutbox();
    let charges = 0;

    const dependencies = {
      catalog,
      orderRepository: repository,
      paymentGateway: {
        async charge(customerId: string, amount: Money) {
          charges += 1;
          return { customerId, amount: amount.toJSON(), confirmationId: `payment-${charges}` };
        },
        async refund(paymentConfirmationId: string, amount: Money) {
          return { paymentConfirmationId, amount: amount.toJSON(), refundConfirmationId: 'refund-1' };
        },
      },
      outbox,
      unitOfWork: new NoopUnitOfWork(),
      authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
      idGenerator: () => 'order-duplicate',
    };

    const command = {
      actor: {
        actorId: 'customer-1-user',
        role: 'customer' as const,
        customerId: 'customer-1',
      },
      customerId: 'customer-1',
      items: [{ sku: 'BOOK', quantity: 1 }],
      idempotencyKey: 'dedupe-key',
    };

    const first = await placeOrder(command, dependencies);
    const second = await placeOrder(
      {
        ...command,
        items: [{ sku: 'BOOK', quantity: 999 }],
      },
      dependencies,
    );

    expect(first).toEqual(second);
    expect(charges).toBe(1);
    expect(outbox.messages).toHaveLength(1);
  });

  it('rejects unauthorized high-value orders before charging payment', async () => {
    const repository = new InMemoryOrderRepository();
    const outbox = new InMemoryOutbox();
    let charges = 0;

    await expect(
      placeOrder(
        {
          actor: {
            actorId: 'customer-1-user',
            role: 'customer',
            customerId: 'customer-1',
          },
          customerId: 'customer-1',
          items: [{ sku: 'BOOK', quantity: 5 }],
        },
        {
          catalog,
          orderRepository: repository,
          paymentGateway: {
            async charge(customerId, amount) {
              charges += 1;
              return { customerId, amount: amount.toJSON(), confirmationId: 'payment-1' };
            },
            async refund(paymentConfirmationId, amount) {
              return { paymentConfirmationId, amount: amount.toJSON(), refundConfirmationId: 'refund-1' };
            },
          },
          outbox,
          unitOfWork: new NoopUnitOfWork(),
          authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
          idGenerator: () => 'order-high-value',
        },
      ),
    ).rejects.toBeInstanceOf(AuthorizationApplicationError);

    expect(charges).toBe(0);
    await expect(repository.findById('order-high-value')).resolves.toBeUndefined();
    expect(outbox.messages).toEqual([]);
  });

  it('rejects idempotent replays from an actor who is not allowed to access the stored order', async () => {
    const repository = new InMemoryOrderRepository();
    const outbox = new InMemoryOutbox();
    const dependencies = {
      catalog,
      orderRepository: repository,
      paymentGateway: {
        async charge(customerId: string, amount: Money) {
          return { customerId, amount: amount.toJSON(), confirmationId: 'payment-1' };
        },
        async refund(paymentConfirmationId: string, amount: Money) {
          return { paymentConfirmationId, amount: amount.toJSON(), refundConfirmationId: 'refund-1' };
        },
      },
      outbox,
      unitOfWork: new NoopUnitOfWork(),
      authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
      idGenerator: () => 'order-duplicate',
    };

    await placeOrder(
      {
        actor: {
          actorId: 'customer-1-user',
          role: 'customer',
          customerId: 'customer-1',
        },
        customerId: 'customer-1',
        items: [{ sku: 'BOOK', quantity: 1 }],
        idempotencyKey: 'shared-dedupe-key',
      },
      dependencies,
    );

    await expect(
      placeOrder(
        {
          actor: {
            actorId: 'customer-2-user',
            role: 'customer',
            customerId: 'customer-2',
          },
          customerId: 'customer-2',
          items: [{ sku: 'BOOK', quantity: 1 }],
          idempotencyKey: 'shared-dedupe-key',
        },
        dependencies,
      ),
    ).rejects.toBeInstanceOf(AuthorizationApplicationError);

    expect(outbox.messages).toHaveLength(1);
  });

  it('wraps payment failures in an application error', async () => {
    const repository = new InMemoryOrderRepository();

    await expect(
      placeOrder(
        {
          actor: {
            actorId: 'customer-1-user',
            role: 'customer',
            customerId: 'customer-1',
          },
          customerId: 'customer-1',
          items: [{ sku: 'BOOK', quantity: 1 }],
        },
        {
          catalog,
          orderRepository: repository,
          paymentGateway: {
            async charge() {
              throw new Error('gateway timeout');
            },
            async refund() {
              throw new Error('gateway timeout');
            },
          },
          outbox: new InMemoryOutbox(),
          unitOfWork: new NoopUnitOfWork(),
          authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
          idGenerator: () => 'order-2',
        },
      ),
    ).rejects.toBeInstanceOf(ExternalServiceError);
  });
});
