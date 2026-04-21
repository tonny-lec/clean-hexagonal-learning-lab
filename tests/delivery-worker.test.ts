import { describe, expect, it } from 'vitest';
import { InMemoryAuditLog } from '../src/adapters/in-memory/in-memory-audit-log.js';
import { InMemoryDeliveryTriggerConsumer } from '../src/adapters/in-memory/in-memory-delivery-trigger-consumer.js';
import { InMemoryIntegrationEventPublisher } from '../src/adapters/in-memory/in-memory-integration-event-publisher.js';
import { InMemoryObservability } from '../src/adapters/in-memory/in-memory-observability.js';
import { InMemoryOrderReadModel } from '../src/adapters/in-memory/in-memory-order-read-model.js';
import { InMemoryOutbox } from '../src/adapters/in-memory/in-memory-outbox.js';
import { OrderSummaryProjectorSubscriber } from '../src/adapters/subscribers/order-summary-projector-subscriber.js';
import { OutboxDeliveryWorker } from '../src/adapters/worker/outbox-delivery-worker.js';
import { pollOutbox } from '../src/application/use-cases/poll-outbox.js';

describe('OutboxDeliveryWorker', () => {
  it('consumes a queued trigger, runs pollOutbox, and acknowledges the trigger', async () => {
    const outbox = new InMemoryOutbox();
    const publisher = new InMemoryIntegrationEventPublisher();
    const readModel = new InMemoryOrderReadModel();
    const triggerConsumer = new InMemoryDeliveryTriggerConsumer();
    const observability = new InMemoryObservability();
    const auditLog = new InMemoryAuditLog();

    await outbox.save([createOrderPlacedEvent('order-worker-1')]);

    const trigger = triggerConsumer.enqueue({
      kind: 'queue-message',
      requestedAt: '2030-01-01T00:00:00.000Z',
      correlationId: 'request-123',
      command: {
        batchSize: 10,
        cycles: 3,
        startAt: '2030-01-01T00:00:00.000Z',
        stepSeconds: 61,
        retryDelaySeconds: 60,
        maxAttempts: 3,
      },
    });

    const worker = new OutboxDeliveryWorker({
      triggerConsumer,
      runPollOutbox: (command) =>
        pollOutbox(command, {
          outbox,
          integrationEventPublisher: publisher,
          integrationEventSubscriber: new OrderSummaryProjectorSubscriber(readModel),
          observability,
        }),
      observability,
      auditLog,
    });

    const result = await worker.runOnce({ integrationEventVersions: ['v1'] });

    expect(result).toEqual({
      status: 'processed',
      triggerId: trigger.id,
      triggerKind: 'queue-message',
      pollResult: {
        totalCycles: 1,
        history: [{ cycle: 1, dispatchedCount: 1, failedCount: 0, deadLetteredCount: 0 }],
      },
    });
    expect(triggerConsumer.acknowledgedTriggerIds).toEqual([trigger.id]);
    expect(triggerConsumer.pendingTriggers).toEqual([]);
    expect(publisher.publishedEvents).toHaveLength(1);
    await expect(readModel.findById('order-worker-1')).resolves.toEqual(
      expect.objectContaining({ orderId: 'order-worker-1' }),
    );
    expect(observability.records).toContainEqual(
      expect.objectContaining({
        name: 'delivery-worker.processed',
        context: expect.objectContaining({
          source: 'worker',
          correlationId: 'request-123',
          traceId: 'trace-request-123',
        }),
      }),
    );
    expect(observability.records).toContainEqual(
      expect.objectContaining({
        name: 'outbox.dispatch.completed',
        context: expect.objectContaining({
          source: 'worker',
          correlationId: 'request-123',
          traceId: 'trace-request-123',
        }),
      }),
    );
    expect(auditLog.entries).toContainEqual(
      expect.objectContaining({
        action: 'delivery-worker-processed',
        aggregateId: trigger.id,
      }),
    );
  });

  it('returns idle when there is no trigger to consume', async () => {
    const triggerConsumer = new InMemoryDeliveryTriggerConsumer();
    const observability = new InMemoryObservability();

    const worker = new OutboxDeliveryWorker({
      triggerConsumer,
      runPollOutbox: async () => ({ totalCycles: 0, history: [] }),
      observability,
    });

    const result = await worker.runOnce();

    expect(result).toEqual({ status: 'idle' });
    expect(observability.records.map((record) => record.name)).toContain('delivery-worker.idle');
  });

  it('requeues the trigger when the worker orchestration fails unexpectedly', async () => {
    const triggerConsumer = new InMemoryDeliveryTriggerConsumer();
    const observability = new InMemoryObservability();
    const auditLog = new InMemoryAuditLog();

    const trigger = triggerConsumer.enqueue({
      kind: 'schedule',
      requestedAt: '2030-01-01T00:00:00.000Z',
      command: { cycles: 1 },
    });

    const worker = new OutboxDeliveryWorker({
      triggerConsumer,
      runPollOutbox: async () => {
        throw new Error('database temporarily unavailable');
      },
      observability,
      auditLog,
    });

    const result = await worker.runOnce();

    expect(result).toEqual({
      status: 'failed',
      triggerId: trigger.id,
      triggerKind: 'schedule',
      error: 'database temporarily unavailable',
    });
    expect(triggerConsumer.releasedTriggers).toEqual([
      {
        triggerId: trigger.id,
        reason: 'database temporarily unavailable',
      },
    ]);
    expect(triggerConsumer.pendingTriggers).toHaveLength(1);
    expect(triggerConsumer.pendingTriggers[0]).toEqual(
      expect.objectContaining({
        id: trigger.id,
        attempts: 1,
        lastError: 'database temporarily unavailable',
      }),
    );
    expect(observability.records.map((record) => record.name)).toContain('delivery-worker.failed');
    expect(auditLog.entries).toContainEqual(
      expect.objectContaining({
        action: 'delivery-worker-failed',
        aggregateId: trigger.id,
      }),
    );
  });
});

function createOrderPlacedEvent(orderId: string) {
  return {
    type: 'order.placed' as const,
    orderId,
    customerId: `${orderId}-customer`,
    lines: [{ sku: 'BOOK', quantity: 1, unitPrice: { amountInMinor: 1200, currency: 'JPY' as const } }],
    totalAmount: { amountInMinor: 1200, currency: 'JPY' as const },
  };
}
