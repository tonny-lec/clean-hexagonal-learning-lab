import { describe, expect, it } from 'vitest';
import { InMemoryOrderRepository } from '../src/adapters/in-memory/in-memory-order-repository.js';
import { InMemoryDomainEventPublisher } from '../src/adapters/in-memory/in-memory-domain-event-publisher.js';
import { NoopUnitOfWork } from '../src/adapters/in-memory/noop-unit-of-work.js';
import { ExternalServiceError } from '../src/application/errors/application-error.js';
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
  it('creates an order using ports and returns a response DTO', async () => {
    const repository = new InMemoryOrderRepository();
    const publishedEvents = new InMemoryDomainEventPublisher();

    const result = await placeOrder(
      {
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
        },
        eventPublisher: publishedEvents,
        unitOfWork: new NoopUnitOfWork(),
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
    expect(publishedEvents.publishedEvents).toEqual([
      {
        type: 'order.placed',
        orderId: 'order-1',
        customerId: 'customer-1',
        totalAmount: { amountInMinor: 2650, currency: 'JPY' },
      },
    ]);
  });

  it('returns the existing order for the same idempotency key', async () => {
    const repository = new InMemoryOrderRepository();
    let charges = 0;

    const dependencies = {
      catalog,
      orderRepository: repository,
      paymentGateway: {
        async charge(customerId: string, amount: Money) {
          charges += 1;
          return { customerId, amount: amount.toJSON(), confirmationId: `payment-${charges}` };
        },
      },
      eventPublisher: new InMemoryDomainEventPublisher(),
      unitOfWork: new NoopUnitOfWork(),
      idGenerator: () => 'order-duplicate',
    };

    const first = await placeOrder(
      {
        customerId: 'customer-1',
        items: [{ sku: 'BOOK', quantity: 1 }],
        idempotencyKey: 'dedupe-key',
      },
      dependencies,
    );

    const second = await placeOrder(
      {
        customerId: 'customer-1',
        items: [{ sku: 'BOOK', quantity: 999 }],
        idempotencyKey: 'dedupe-key',
      },
      dependencies,
    );

    expect(first).toEqual(second);
    expect(charges).toBe(1);
  });

  it('wraps payment failures in an application error', async () => {
    const repository = new InMemoryOrderRepository();

    await expect(
      placeOrder(
        {
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
          },
          eventPublisher: new InMemoryDomainEventPublisher(),
          unitOfWork: new NoopUnitOfWork(),
          idGenerator: () => 'order-2',
        },
      ),
    ).rejects.toBeInstanceOf(ExternalServiceError);
  });
});
