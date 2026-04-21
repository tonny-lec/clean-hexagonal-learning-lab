import { describe, expect, it } from 'vitest';
import { InMemoryIntegrationEventPublisher } from '../src/adapters/in-memory/in-memory-integration-event-publisher.js';
import { InMemoryOrderReadModel } from '../src/adapters/in-memory/in-memory-order-read-model.js';
import { InMemoryOutbox } from '../src/adapters/in-memory/in-memory-outbox.js';
import { OrderSummaryProjectorSubscriber } from '../src/adapters/subscribers/order-summary-projector-subscriber.js';
import { pollOutbox } from '../src/application/use-cases/poll-outbox.js';

class FailOncePublisher extends InMemoryIntegrationEventPublisher {
  private shouldFail = true;

  override async publish(events: Parameters<InMemoryIntegrationEventPublisher['publish']>[0]): Promise<void> {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw new Error('first dispatch fails');
    }

    await super.publish(events);
  }
}

describe('pollOutbox', () => {
  it('retries dispatch across polling cycles until the message is published', async () => {
    const outbox = new InMemoryOutbox();
    const publisher = new FailOncePublisher();
    const readModel = new InMemoryOrderReadModel();

    await outbox.save([
      {
        type: 'order.placed',
        orderId: 'order-poller',
        customerId: 'customer-1',
        lines: [{ sku: 'BOOK', quantity: 1, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
        totalAmount: { amountInMinor: 1200, currency: 'JPY' },
      },
    ]);

    const result = await pollOutbox(
      {
        batchSize: 10,
        maxAttempts: 3,
        retryDelaySeconds: 60,
        cycles: 3,
        startAt: '2030-01-01T00:00:00.000Z',
        stepSeconds: 61,
      },
      {
        outbox,
        integrationEventPublisher: publisher,
        integrationEventSubscriber: new OrderSummaryProjectorSubscriber(readModel),
      },
    );

    expect(result.totalCycles).toBe(2);
    expect(result.history).toEqual([
      { cycle: 1, dispatchedCount: 0, failedCount: 1, deadLetteredCount: 0 },
      { cycle: 2, dispatchedCount: 1, failedCount: 0, deadLetteredCount: 0 },
    ]);
    expect(await outbox.listPending(10, '2030-01-01T00:03:00.000Z')).toEqual([]);
    await expect(readModel.findById('order-poller')).resolves.toEqual(
      expect.objectContaining({ orderId: 'order-poller' }),
    );
  });

  it('keeps polling until a later cycle reaches the retry window', async () => {
    const outbox = new InMemoryOutbox();
    const publisher = new FailOncePublisher();
    const readModel = new InMemoryOrderReadModel();

    await outbox.save([
      {
        type: 'order.placed',
        orderId: 'order-poller-late-retry',
        customerId: 'customer-1',
        lines: [{ sku: 'BOOK', quantity: 1, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
        totalAmount: { amountInMinor: 1200, currency: 'JPY' },
      },
    ]);

    const result = await pollOutbox(
      {
        batchSize: 10,
        maxAttempts: 3,
        retryDelaySeconds: 120,
        cycles: 3,
        startAt: '2030-01-01T00:00:00.000Z',
        stepSeconds: 60,
      },
      {
        outbox,
        integrationEventPublisher: publisher,
        integrationEventSubscriber: new OrderSummaryProjectorSubscriber(readModel),
      },
    );

    expect(result.totalCycles).toBe(3);
    expect(result.history).toEqual([
      { cycle: 1, dispatchedCount: 0, failedCount: 1, deadLetteredCount: 0 },
      { cycle: 2, dispatchedCount: 0, failedCount: 0, deadLetteredCount: 0 },
      { cycle: 3, dispatchedCount: 1, failedCount: 0, deadLetteredCount: 0 },
    ]);
  });
});
