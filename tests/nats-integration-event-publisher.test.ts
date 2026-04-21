import { describe, expect, it, vi } from 'vitest';
import { NatsIntegrationEventPublisher } from '../src/adapters/nats/nats-integration-event-publisher.js';

describe('NatsIntegrationEventPublisher', () => {
  it('maps integration events into NATS subjects, headers, and JSON payloads', async () => {
    const publishedMessages: Array<{
      subject: string;
      headers: Record<string, string>;
      payload: string;
    }> = [];

    const close = vi.fn(async () => undefined);
    const publisher = new NatsIntegrationEventPublisher({
      subjectPrefix: 'lab',
      brokerClientFactory: async () => ({
        publish: async (message) => {
          publishedMessages.push(message);
        },
        close,
      }),
    });

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

    expect(publishedMessages).toEqual([
      expect.objectContaining({
        subject: 'lab.order.placed.v1',
        headers: expect.objectContaining({
          eventType: 'order.placed.v1',
          schemaVersion: '1',
          integrationEventId: 'event-1',
          orderId: 'order-1',
        }),
        payload: JSON.stringify({
          type: 'order.placed.v1',
          schemaVersion: 1,
          integrationEventId: 'event-1',
          occurredAt: '2030-01-01T00:00:00.000Z',
          orderId: 'order-1',
          customerId: 'customer-1',
          lines: [{ sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
          totalAmount: { amountInMinor: 2400, currency: 'JPY' },
        }),
      }),
      expect.objectContaining({
        subject: 'lab.order.placed.v2',
        headers: expect.objectContaining({
          eventType: 'order.placed.v2',
          schemaVersion: '2',
          integrationEventId: 'event-2',
          orderId: 'order-2',
        }),
        payload: JSON.stringify({
          type: 'order.placed.v2',
          schemaVersion: 2,
          integrationEventId: 'event-2',
          occurredAt: '2030-01-01T00:00:00.000Z',
          orderId: 'order-2',
          customer: { id: 'customer-2' },
          lineItems: [{ sku: 'PEN', quantity: 1, unitPrice: { amountInMinor: 250, currency: 'JPY' } }],
          totals: { amountInMinor: 250, currency: 'JPY' },
          lineCount: 1,
        }),
      }),
    ]);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes the broker client even when publish fails', async () => {
    const close = vi.fn(async () => undefined);
    const publisher = new NatsIntegrationEventPublisher({
      brokerClientFactory: async () => ({
        publish: async () => {
          throw new Error('nats publish failed');
        },
        close,
      }),
    });

    await expect(
      publisher.publish([
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
      ]),
    ).rejects.toThrow('nats publish failed');

    expect(close).toHaveBeenCalledTimes(1);
  });
});
