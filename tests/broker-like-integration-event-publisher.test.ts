import { describe, expect, it } from 'vitest';
import { BrokerLikeIntegrationEventPublisher } from '../src/adapters/broker-like/broker-like-integration-event-publisher.js';

describe('BrokerLikeIntegrationEventPublisher', () => {
  it('stores versioned integration events as broker envelopes with topic, key, and headers', async () => {
    const publisher = new BrokerLikeIntegrationEventPublisher();

    await publisher.publish([
      {
        type: 'order.placed.v1',
        schemaVersion: 1,
        integrationEventId: 'event-1',
        occurredAt: '2030-01-01T00:00:00.000Z',
        orderId: 'order-1',
        customerId: 'customer-1',
        lines: [{ sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
        totalAmount: { amountInMinor: 2400, currency: 'JPY' },
      },
      {
        type: 'order.placed.v2',
        schemaVersion: 2,
        integrationEventId: 'event-2',
        occurredAt: '2030-01-01T00:00:00.000Z',
        orderId: 'order-2',
        customer: { id: 'customer-2' },
        lineItems: [{ sku: 'PEN', quantity: 1, unitPrice: { amountInMinor: 250, currency: 'JPY' } }],
        totals: { amountInMinor: 250, currency: 'JPY' },
        lineCount: 1,
      },
    ]);

    expect(publisher.envelopes).toEqual([
      expect.objectContaining({
        topic: 'orders.order-placed.v1',
        key: 'order-1',
        headers: expect.objectContaining({ schemaVersion: '1', eventType: 'order.placed.v1' }),
        event: expect.objectContaining({ integrationEventId: 'event-1' }),
      }),
      expect.objectContaining({
        topic: 'orders.order-placed.v2',
        key: 'order-2',
        headers: expect.objectContaining({ schemaVersion: '2', eventType: 'order.placed.v2' }),
        event: expect.objectContaining({ integrationEventId: 'event-2' }),
      }),
    ]);
  });
});
