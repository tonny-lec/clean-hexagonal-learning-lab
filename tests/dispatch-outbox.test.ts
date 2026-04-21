import { describe, expect, it } from 'vitest';
import { InMemoryAuditLog } from '../src/adapters/in-memory/in-memory-audit-log.js';
import { InMemoryIntegrationEventPublisher } from '../src/adapters/in-memory/in-memory-integration-event-publisher.js';
import { InMemoryObservability } from '../src/adapters/in-memory/in-memory-observability.js';
import { InMemoryOrderReadModel } from '../src/adapters/in-memory/in-memory-order-read-model.js';
import { InMemoryOutbox } from '../src/adapters/in-memory/in-memory-outbox.js';
import { dispatchOutbox } from '../src/application/use-cases/dispatch-outbox.js';

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

    const result = await dispatchOutbox({ batchSize: 10 }, {
      outbox,
      integrationEventPublisher: publisher,
      orderReadModel: readModel,
      observability,
      auditLog,
    });

    expect(result).toEqual({ dispatchedCount: 1 });
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
});
