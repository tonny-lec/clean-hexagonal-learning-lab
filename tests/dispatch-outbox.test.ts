import { describe, expect, it } from 'vitest';
import type { IntegrationEventSubscriberPort } from '../src/application/ports/integration-event-subscriber-port.js';
import { InMemoryAuditLog } from '../src/adapters/in-memory/in-memory-audit-log.js';
import { InMemoryIntegrationEventPublisher } from '../src/adapters/in-memory/in-memory-integration-event-publisher.js';
import { FailOnceIntegrationEventSubscriber } from '../src/adapters/subscribers/fail-once-integration-event-subscriber.js';
import { OrderSummaryProjectorSubscriber } from '../src/adapters/subscribers/order-summary-projector-subscriber.js';
import { InMemoryObservability } from '../src/adapters/in-memory/in-memory-observability.js';
import { InMemoryOrderReadModel } from '../src/adapters/in-memory/in-memory-order-read-model.js';
import { InMemoryOutbox } from '../src/adapters/in-memory/in-memory-outbox.js';
import { dispatchOutbox } from '../src/application/use-cases/dispatch-outbox.js';

class FailingIntegrationEventPublisher extends InMemoryIntegrationEventPublisher {
  constructor(private failuresBeforeSuccess: number) {
    super();
  }

  override async publish(events: Parameters<InMemoryIntegrationEventPublisher['publish']>[0]): Promise<void> {
    if (this.failuresBeforeSuccess > 0) {
      this.failuresBeforeSuccess -= 1;
      throw new Error('simulated publish failure');
    }

    await super.publish(events);
  }
}

class FailOncePublishAckOutbox extends InMemoryOutbox {
  private shouldFail = true;

  override async markAsPublished(ids: string[]): Promise<void> {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw new Error('mark-as-published failed');
    }

    await super.markAsPublished(ids);
  }
}

class RecordingSubscriber implements IntegrationEventSubscriberPort {
  readonly handled: Array<{ type: string; orderId: string }> = [];

  async handle(event: Parameters<IntegrationEventSubscriberPort['handle']>[0]): Promise<void> {
    this.handled.push({ type: event.type, orderId: event.orderId });
  }
}

describe('dispatchOutbox', () => {
  it('publishes integration events, updates the read model, records audit/observability, and marks outbox messages as published', async () => {
    const outbox = new InMemoryOutbox();
    const publisher = new InMemoryIntegrationEventPublisher();
    const readModel = new InMemoryOrderReadModel();
    const observability = new InMemoryObservability();
    const auditLog = new InMemoryAuditLog();

    await outbox.save([
      {
        type: 'order.placed',
        orderId: 'order-1',
        customerId: 'customer-1',
        lines: [
          { sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } },
          { sku: 'PEN', quantity: 1, unitPrice: { amountInMinor: 250, currency: 'JPY' } },
        ],
        totalAmount: { amountInMinor: 2650, currency: 'JPY' },
      },
    ]);

    const result = await dispatchOutbox(
      { batchSize: 10, now: '2030-01-01T00:00:00.000Z' },
      {
        outbox,
        integrationEventPublisher: publisher,
        integrationEventSubscriber: new OrderSummaryProjectorSubscriber(readModel),
        observability,
        auditLog,
      },
    );

    expect(result).toEqual({ dispatchedCount: 1, failedCount: 0, deadLetteredCount: 0 });
    expect(publisher.publishedEvents).toHaveLength(1);
    expect(publisher.publishedEvents[0]).toMatchObject({
      type: 'order.placed.v1',
      orderId: 'order-1',
      customerId: 'customer-1',
      lines: [
        { sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } },
        { sku: 'PEN', quantity: 1, unitPrice: { amountInMinor: 250, currency: 'JPY' } },
      ],
      totalAmount: { amountInMinor: 2650, currency: 'JPY' },
    });
    await expect(readModel.findById('order-1')).resolves.toEqual({
      orderId: 'order-1',
      customerId: 'customer-1',
      lines: [
        { sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } },
        { sku: 'PEN', quantity: 1, unitPrice: { amountInMinor: 250, currency: 'JPY' } },
      ],
      totalAmount: { amountInMinor: 2650, currency: 'JPY' },
    });
    expect(auditLog.entries).toHaveLength(1);
    expect(auditLog.entries[0]).toMatchObject({
      action: 'integration-event-published',
      aggregateId: 'order-1',
    });
    expect(observability.records.map((record) => record.name)).toContain('outbox.dispatch.completed');
    await expect(outbox.listPending()).resolves.toEqual([]);
  });

  it('records retry metadata and leaves the message pending for a later attempt when publish fails', async () => {
    const outbox = new InMemoryOutbox();
    const publisher = new FailingIntegrationEventPublisher(1);
    const readModel = new InMemoryOrderReadModel();
    const observability = new InMemoryObservability();

    await outbox.save([
      {
        type: 'order.placed',
        orderId: 'order-retry',
        customerId: 'customer-1',
        lines: [{ sku: 'BOOK', quantity: 1, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
        totalAmount: { amountInMinor: 1200, currency: 'JPY' },
      },
    ]);

    const first = await dispatchOutbox(
      {
        batchSize: 10,
        now: '2030-01-01T00:00:00.000Z',
        retryDelaySeconds: 60,
        maxAttempts: 3,
      },
      {
        outbox,
        integrationEventPublisher: publisher,
        integrationEventSubscriber: new OrderSummaryProjectorSubscriber(readModel),
        observability,
      },
    );

    expect(first).toEqual({ dispatchedCount: 0, failedCount: 1, deadLetteredCount: 0 });
    expect(await outbox.listPending(10, '2030-01-01T00:00:30.000Z')).toEqual([]);

    const pendingLater = await outbox.listPending(10, '2030-01-01T00:01:01.000Z');
    expect(pendingLater).toHaveLength(1);
    expect(pendingLater[0]).toMatchObject({
      retryCount: 1,
      lastError: 'simulated publish failure',
      deadLetteredAt: null,
      nextAttemptAt: '2030-01-01T00:01:00.000Z',
      publishedAt: null,
    });

    const second = await dispatchOutbox(
      {
        batchSize: 10,
        now: '2030-01-01T00:01:01.000Z',
        retryDelaySeconds: 60,
        maxAttempts: 3,
      },
      {
        outbox,
        integrationEventPublisher: publisher,
        integrationEventSubscriber: new OrderSummaryProjectorSubscriber(readModel),
        observability,
      },
    );

    expect(second).toEqual({ dispatchedCount: 1, failedCount: 0, deadLetteredCount: 0 });
    expect(await outbox.listPending()).toEqual([]);
  });

  it('dead-letters the message after the max attempt threshold is reached', async () => {
    const outbox = new InMemoryOutbox();
    const publisher = new FailingIntegrationEventPublisher(99);
    const readModel = new InMemoryOrderReadModel();
    const observability = new InMemoryObservability();
    const auditLog = new InMemoryAuditLog();

    await outbox.save([
      {
        type: 'order.placed',
        orderId: 'order-dead-letter',
        customerId: 'customer-1',
        lines: [{ sku: 'BOOK', quantity: 1, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
        totalAmount: { amountInMinor: 1200, currency: 'JPY' },
      },
    ]);

    const result = await dispatchOutbox(
      {
        batchSize: 10,
        now: '2030-01-01T00:00:00.000Z',
        retryDelaySeconds: 60,
        maxAttempts: 1,
      },
      {
        outbox,
        integrationEventPublisher: publisher,
        integrationEventSubscriber: new OrderSummaryProjectorSubscriber(readModel),
        observability,
        auditLog,
      },
    );

    expect(result).toEqual({ dispatchedCount: 0, failedCount: 1, deadLetteredCount: 1 });
    expect(await outbox.listPending(10, '2030-01-01T01:00:00.000Z')).toEqual([]);

    const deadLetters = await outbox.listDeadLetters();
    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0]).toMatchObject({
      aggregateId: 'order-dead-letter',
      retryCount: 1,
      lastError: 'simulated publish failure',
      deadLetteredAt: '2030-01-01T00:00:00.000Z',
    });
    expect(auditLog.entries).toContainEqual(
      expect.objectContaining({
        action: 'outbox-message-dead-lettered',
        aggregateId: 'order-dead-letter',
      }),
    );
    expect(observability.records).toContainEqual(
      expect.objectContaining({
        name: 'outbox.dispatch.failed',
        attributes: expect.objectContaining({ deadLettered: true }),
      }),
    );
  });

  it('surfaces a blocking error when a subscriber boundary throws without a replay store', async () => {
    const outbox = new InMemoryOutbox();
    const publisher = new InMemoryIntegrationEventPublisher();
    const readModel = new InMemoryOrderReadModel();
    const observability = new InMemoryObservability();

    await outbox.save([
      {
        type: 'order.placed',
        orderId: 'order-projection-failure',
        customerId: 'customer-1',
        lines: [{ sku: 'BOOK', quantity: 1, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
        totalAmount: { amountInMinor: 1200, currency: 'JPY' },
      },
    ]);

    await expect(
      dispatchOutbox(
        {
          batchSize: 10,
          now: '2030-01-01T00:00:00.000Z',
          retryDelaySeconds: 60,
        },
        {
          outbox,
          integrationEventPublisher: publisher,
          integrationEventSubscriber: new FailOnceIntegrationEventSubscriber(
            'order-summary-projector',
            new OrderSummaryProjectorSubscriber(readModel),
            'projector temporarily unavailable',
          ),
          observability,
        },
      ),
    ).rejects.toThrow('projector temporarily unavailable');

    expect(publisher.publishedEvents).toHaveLength(1);
    expect(await outbox.listPending(10, '2030-01-01T00:10:00.000Z')).toEqual([]);
    expect(observability.records).toContainEqual(
      expect.objectContaining({
        name: 'subscriber.delivery.blocked',
        attributes: expect.objectContaining({ aggregateId: 'order-projection-failure' }),
      }),
    );
  });

  it('dead-letters the message instead of republishing when acknowledgement fails after publish', async () => {
    const outbox = new FailOncePublishAckOutbox();
    const publisher = new InMemoryIntegrationEventPublisher();
    const readModel = new InMemoryOrderReadModel();
    const observability = new InMemoryObservability();

    await outbox.save([
      {
        type: 'order.placed',
        orderId: 'order-ack-failure',
        customerId: 'customer-1',
        lines: [{ sku: 'BOOK', quantity: 1, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
        totalAmount: { amountInMinor: 1200, currency: 'JPY' },
      },
    ]);

    const first = await dispatchOutbox(
      {
        batchSize: 10,
        now: '2030-01-01T00:00:00.000Z',
      },
      {
        outbox,
        integrationEventPublisher: publisher,
        integrationEventSubscriber: new OrderSummaryProjectorSubscriber(readModel),
        observability,
      },
    );

    expect(first).toEqual({ dispatchedCount: 1, failedCount: 0, deadLetteredCount: 1 });
    expect(publisher.publishedEvents).toHaveLength(1);
    expect(await outbox.listPending(10, '2030-01-01T00:10:00.000Z')).toEqual([]);
    expect(await outbox.listDeadLetters()).toEqual([
      expect.objectContaining({
        aggregateId: 'order-ack-failure',
        lastError: 'publish-succeeded-but-ack-failed: mark-as-published failed',
      }),
    ]);
    expect(observability.records).toContainEqual(
      expect.objectContaining({
        name: 'outbox.acknowledgement.failed',
        attributes: expect.objectContaining({ aggregateId: 'order-ack-failure' }),
      }),
    );

    const second = await dispatchOutbox(
      {
        batchSize: 10,
        now: '2030-01-01T00:10:00.000Z',
      },
      {
        outbox,
        integrationEventPublisher: publisher,
        integrationEventSubscriber: new OrderSummaryProjectorSubscriber(readModel),
        observability,
      },
    );

    expect(second).toEqual({ dispatchedCount: 0, failedCount: 0, deadLetteredCount: 0 });
    expect(publisher.publishedEvents).toHaveLength(1);
  });

  it('can publish both v1 and v2 contracts while notifying the subscriber boundary', async () => {
    const outbox = new InMemoryOutbox();
    const publisher = new InMemoryIntegrationEventPublisher();
    const subscriber = new RecordingSubscriber();

    await outbox.save([
      {
        type: 'order.placed',
        orderId: 'order-versioned',
        customerId: 'customer-1',
        lines: [{ sku: 'BOOK', quantity: 1, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
        totalAmount: { amountInMinor: 1200, currency: 'JPY' },
      },
    ]);

    const result = await dispatchOutbox(
      {
        batchSize: 10,
        now: '2030-01-01T00:00:00.000Z',
        integrationEventVersions: ['v1', 'v2'],
      },
      {
        outbox,
        integrationEventPublisher: publisher,
        integrationEventSubscriber: subscriber,
      },
    );

    expect(result).toEqual({ dispatchedCount: 1, failedCount: 0, deadLetteredCount: 0 });
    expect(publisher.publishedEvents.map((event) => event.type)).toEqual(['order.placed.v1', 'order.placed.v2']);
    expect(subscriber.handled).toEqual([
      { type: 'order.placed.v1', orderId: 'order-versioned' },
      { type: 'order.placed.v2', orderId: 'order-versioned' },
    ]);
  });
});
