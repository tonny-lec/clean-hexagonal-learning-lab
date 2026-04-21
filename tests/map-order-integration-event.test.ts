import { describe, expect, it } from 'vitest';
import { toOrderPlacedIntegrationEvent, toOrderPlacedIntegrationEvents } from '../src/application/integration-events/map-order-integration-event.js';
import type { OutboxMessage } from '../src/application/ports/outbox-port.js';

function createOutboxMessage(): OutboxMessage {
  return {
    id: 'outbox-1',
    eventType: 'order.placed',
    aggregateId: 'order-1',
    payload: {
      type: 'order.placed',
      orderId: 'order-1',
      customerId: 'customer-1',
      lines: [{ sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
      totalAmount: { amountInMinor: 2400, currency: 'JPY' },
    },
    occurredAt: '2030-01-01T00:00:00.000Z',
    publishedAt: null,
    retryCount: 0,
    lastError: null,
    nextAttemptAt: '2030-01-01T00:00:00.000Z',
    deadLetteredAt: null,
  };
}

describe('order integration event mapping', () => {
  it('maps the domain event into a versioned v1 contract by default', () => {
    const event = toOrderPlacedIntegrationEvent(createOutboxMessage());

    expect(event).toEqual({
      type: 'order.placed.v1',
      schemaVersion: 1,
      integrationEventId: 'outbox-1-v1',
      occurredAt: '2030-01-01T00:00:00.000Z',
      orderId: 'order-1',
      customerId: 'customer-1',
      lines: [{ sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
      totalAmount: { amountInMinor: 2400, currency: 'JPY' },
    });
  });

  it('can emit both v1 and v2 contracts for the same domain event', () => {
    const events = toOrderPlacedIntegrationEvents(createOutboxMessage(), ['v1', 'v2']);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: 'order.placed.v1', schemaVersion: 1 });
    expect(events[1]).toEqual({
      type: 'order.placed.v2',
      schemaVersion: 2,
      integrationEventId: 'outbox-1-v2',
      occurredAt: '2030-01-01T00:00:00.000Z',
      orderId: 'order-1',
      customer: { id: 'customer-1' },
      lineItems: [{ sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
      totals: { amountInMinor: 2400, currency: 'JPY' },
      lineCount: 1,
    });
  });
});
