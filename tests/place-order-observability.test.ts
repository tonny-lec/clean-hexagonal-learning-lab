import { describe, expect, it } from 'vitest';
import { InMemoryAuditLog } from '../src/adapters/in-memory/in-memory-audit-log.js';
import { InMemoryObservability } from '../src/adapters/in-memory/in-memory-observability.js';
import { InMemoryOrderRepository } from '../src/adapters/in-memory/in-memory-order-repository.js';
import { InMemoryOutbox } from '../src/adapters/in-memory/in-memory-outbox.js';
import { NoopUnitOfWork } from '../src/adapters/in-memory/noop-unit-of-work.js';
import { OrderAuthorizationPolicy } from '../src/application/policies/order-authorization-policy.js';
import { placeOrder } from '../src/application/use-cases/place-order.js';
import { Money } from '../src/domain/money.js';

describe('placeOrder observability', () => {
  it('records observability and audit information around order placement', async () => {
    const observability = new InMemoryObservability();
    const auditLog = new InMemoryAuditLog();

    await placeOrder(
      {
        actor: { actorId: 'admin-1', role: 'admin' },
        customerId: 'customer-1',
        items: [{ sku: 'BOOK', quantity: 1 }],
        idempotencyKey: 'obs-1',
        telemetry: {
          source: 'http',
          requestId: 'request-1',
          correlationId: 'request-1',
          traceId: 'trace-request-1',
        },
      },
      {
        catalog: {
          async getUnitPrice() {
            return Money.fromMinor(1200, 'JPY');
          },
        },
        orderRepository: new InMemoryOrderRepository(),
        paymentGateway: {
          async charge(customerId, amount) {
            return { customerId, amount: amount.toJSON(), confirmationId: 'payment-1' };
          },
        },
        outbox: new InMemoryOutbox(),
        unitOfWork: new NoopUnitOfWork(),
        authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
        observability,
        auditLog,
        idGenerator: () => 'order-observability',
      },
    );

    expect(observability.records.map((record) => record.name)).toEqual([
      'order.place.started',
      'order.place.completed',
    ]);
    expect(observability.records).toContainEqual(
      expect.objectContaining({
        name: 'order.place.started',
        context: {
          source: 'http',
          requestId: 'request-1',
          correlationId: 'request-1',
          traceId: 'trace-request-1',
        },
      }),
    );
    expect(observability.counters).toMatchObject({
      'order.place.started': 1,
      'order.place.completed': 1,
    });
    expect(auditLog.entries).toHaveLength(1);
    expect(auditLog.entries[0]).toMatchObject({
      action: 'order-placed',
      aggregateId: 'order-observability',
    });
  });
});
