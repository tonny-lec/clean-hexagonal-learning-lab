import { describe, expect, it } from 'vitest';
import { InMemoryAuditLog } from '../src/adapters/in-memory/in-memory-audit-log.js';
import { InMemoryIntegrationEventPublisher } from '../src/adapters/in-memory/in-memory-integration-event-publisher.js';
import { InMemoryObservability } from '../src/adapters/in-memory/in-memory-observability.js';
import { InMemoryOrderReadModel } from '../src/adapters/in-memory/in-memory-order-read-model.js';
import { InMemoryOutbox } from '../src/adapters/in-memory/in-memory-outbox.js';
import { InMemorySubscriberDeliveryFailureStore } from '../src/adapters/in-memory/in-memory-subscriber-delivery-failure-store.js';
import { FanOutIntegrationEventSubscriber } from '../src/adapters/subscribers/fan-out-integration-event-subscriber.js';
import { StaticSubscriberFailurePolicy } from '../src/adapters/subscribers/static-subscriber-failure-policy.js';
import { dispatchOutbox } from '../src/application/use-cases/dispatch-outbox.js';
import { replaySubscriberFailures } from '../src/application/use-cases/replay-subscriber-failures.js';
import type { NamedIntegrationEventSubscriberPort } from '../src/application/ports/named-integration-event-subscriber-port.js';
import type { OrderPlacedIntegrationEvent } from '../src/application/integration-events/order-integration-event.js';

class RecordingSubscriber implements NamedIntegrationEventSubscriberPort {
  readonly handled: Array<{ type: string; orderId: string }> = [];

  constructor(readonly subscriberName: string) {}

  async handle(event: OrderPlacedIntegrationEvent): Promise<void> {
    this.handled.push({ type: event.type, orderId: event.orderId });
  }
}

class FailOnceProjectorSubscriber implements NamedIntegrationEventSubscriberPort {
  readonly subscriberName = 'order-summary-projector';
  private shouldFail = true;

  constructor(private readonly readModel: InMemoryOrderReadModel) {}

  async handle(event: OrderPlacedIntegrationEvent): Promise<void> {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw new Error('projector temporarily unavailable');
    }

    if (event.type === 'order.placed.v2') {
      await this.readModel.upsert({
        orderId: event.orderId,
        customerId: event.customer.id,
        lines: event.lineItems,
        totalAmount: event.totals,
      });
      return;
    }

    await this.readModel.upsert({
      orderId: event.orderId,
      customerId: event.customerId,
      lines: event.lines,
      totalAmount: event.totalAmount,
    });
  }
}

class AlwaysFailingSubscriber implements NamedIntegrationEventSubscriberPort {
  constructor(readonly subscriberName: string) {}

  async handle(): Promise<void> {
    throw new Error(`${this.subscriberName} keeps failing`);
  }
}

describe('subscriber replay and re-drive', () => {
  it('records a per-subscriber failure without blocking publish or other subscribers', async () => {
    const outbox = new InMemoryOutbox();
    const publisher = new InMemoryIntegrationEventPublisher();
    const readModel = new InMemoryOrderReadModel();
    const failureStore = new InMemorySubscriberDeliveryFailureStore();
    const observability = new InMemoryObservability();
    const projector = new FailOnceProjectorSubscriber(readModel);
    const recorder = new RecordingSubscriber('analytics-recorder');
    const subscriber = new FanOutIntegrationEventSubscriber([projector, recorder], {
      failureStore,
      failurePolicy: new StaticSubscriberFailurePolicy({
        'order-summary-projector': { maxAttempts: 3, retryDelaySeconds: 60 },
        'analytics-recorder': { maxAttempts: 1, retryDelaySeconds: 0 },
      }),
      observability,
      now: () => '2030-01-01T00:00:00.000Z',
    });

    await outbox.save([
      {
        type: 'order.placed',
        orderId: 'order-subscriber-replay',
        customerId: 'customer-1',
        lines: [{ sku: 'BOOK', quantity: 1, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
        totalAmount: { amountInMinor: 1200, currency: 'JPY' },
      },
    ]);

    const result = await dispatchOutbox(
      { batchSize: 10, now: '2030-01-01T00:00:00.000Z' },
      {
        outbox,
        integrationEventPublisher: publisher,
        integrationEventSubscriber: subscriber,
        observability,
      },
    );

    expect(result).toEqual({ dispatchedCount: 1, failedCount: 0, deadLetteredCount: 0 });
    expect(publisher.publishedEvents).toHaveLength(1);
    expect(recorder.handled).toEqual([{ type: 'order.placed.v1', orderId: 'order-subscriber-replay' }]);
    await expect(readModel.findById('order-subscriber-replay')).resolves.toBeUndefined();
    expect(await failureStore.listReplayable(10, '2030-01-01T00:01:01.000Z')).toEqual([
      expect.objectContaining({
        subscriberName: 'order-summary-projector',
        retryCount: 1,
        lastError: 'projector temporarily unavailable',
        nextAttemptAt: '2030-01-01T00:01:00.000Z',
        deadLetteredAt: null,
      }),
    ]);
    expect(observability.records.map((record) => record.name)).toContain('subscriber.delivery.failed');
  });

  it('replays failed subscriber deliveries and resolves the stored failure', async () => {
    const outbox = new InMemoryOutbox();
    const publisher = new InMemoryIntegrationEventPublisher();
    const readModel = new InMemoryOrderReadModel();
    const failureStore = new InMemorySubscriberDeliveryFailureStore();
    const observability = new InMemoryObservability();
    const auditLog = new InMemoryAuditLog();
    const projector = new FailOnceProjectorSubscriber(readModel);
    const subscriber = new FanOutIntegrationEventSubscriber([projector], {
      failureStore,
      failurePolicy: new StaticSubscriberFailurePolicy({
        'order-summary-projector': { maxAttempts: 3, retryDelaySeconds: 60 },
      }),
      observability,
      auditLog,
      now: () => '2030-01-01T00:00:00.000Z',
    });

    await outbox.save([
      {
        type: 'order.placed',
        orderId: 'order-replay-success',
        customerId: 'customer-1',
        lines: [{ sku: 'BOOK', quantity: 1, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
        totalAmount: { amountInMinor: 1200, currency: 'JPY' },
      },
    ]);

    await dispatchOutbox(
      { batchSize: 10, now: '2030-01-01T00:00:00.000Z' },
      {
        outbox,
        integrationEventPublisher: publisher,
        integrationEventSubscriber: subscriber,
        observability,
        auditLog,
      },
    );

    const replayResult = await replaySubscriberFailures(
      { batchSize: 10, now: '2030-01-01T00:01:01.000Z' },
      {
        failureStore,
        subscribers: [projector],
        failurePolicy: new StaticSubscriberFailurePolicy({
          'order-summary-projector': { maxAttempts: 3, retryDelaySeconds: 60 },
        }),
        observability,
        auditLog,
      },
    );

    expect(replayResult).toEqual({ replayedCount: 1, failedCount: 0, deadLetteredCount: 0 });
    await expect(readModel.findById('order-replay-success')).resolves.toEqual(
      expect.objectContaining({ orderId: 'order-replay-success' }),
    );
    expect(await failureStore.listReplayable(10, '2030-01-01T01:00:00.000Z')).toEqual([]);
    expect(auditLog.entries).toContainEqual(
      expect.objectContaining({
        action: 'subscriber-delivery-replayed',
        aggregateId: 'order-summary-projector',
      }),
    );
  });

  it('dead-letters a subscriber failure after replay exhausts its max attempts', async () => {
    const failureStore = new InMemorySubscriberDeliveryFailureStore();
    const observability = new InMemoryObservability();
    const auditLog = new InMemoryAuditLog();
    const alwaysFailingSubscriber = new AlwaysFailingSubscriber('email-notifier');

    await failureStore.recordFailure({
      subscriberName: 'email-notifier',
      event: {
        type: 'order.placed.v1',
        schemaVersion: 1,
        integrationEventId: 'event-dead-letter',
        occurredAt: '2030-01-01T00:00:00.000Z',
        orderId: 'order-dead-letter',
        customerId: 'customer-1',
        lines: [{ sku: 'BOOK', quantity: 1, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
        totalAmount: { amountInMinor: 1200, currency: 'JPY' },
      },
      failedAt: '2030-01-01T00:00:00.000Z',
      errorMessage: 'email-notifier keeps failing',
      nextAttemptAt: '2030-01-01T00:00:00.000Z',
      deadLetteredAt: null,
    });

    const replayResult = await replaySubscriberFailures(
      { batchSize: 10, now: '2030-01-01T00:00:00.000Z' },
      {
        failureStore,
        subscribers: [alwaysFailingSubscriber],
        failurePolicy: new StaticSubscriberFailurePolicy({
          'email-notifier': { maxAttempts: 2, retryDelaySeconds: 60 },
        }),
        observability,
        auditLog,
      },
    );

    expect(replayResult).toEqual({ replayedCount: 0, failedCount: 1, deadLetteredCount: 1 });
    expect(await failureStore.listReplayable(10, '2030-01-01T01:00:00.000Z')).toEqual([]);
    expect(await failureStore.listDeadLetters()).toEqual([
      expect.objectContaining({
        subscriberName: 'email-notifier',
        retryCount: 2,
        deadLetteredAt: '2030-01-01T00:00:00.000Z',
      }),
    ]);
    expect(observability.records).toContainEqual(
      expect.objectContaining({
        name: 'subscriber.delivery.dead-lettered',
        attributes: expect.objectContaining({ subscriberName: 'email-notifier' }),
      }),
    );
  });
});
