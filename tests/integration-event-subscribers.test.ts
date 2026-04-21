import { describe, expect, it } from 'vitest';
import { InMemoryOrderReadModel } from '../src/adapters/in-memory/in-memory-order-read-model.js';
import { FanOutIntegrationEventSubscriber } from '../src/adapters/subscribers/fan-out-integration-event-subscriber.js';
import { OrderSummaryProjectorSubscriber } from '../src/adapters/subscribers/order-summary-projector-subscriber.js';
import type { OrderPlacedIntegrationEvent } from '../src/application/integration-events/order-integration-event.js';
import type { IntegrationEventSubscriberPort } from '../src/application/ports/integration-event-subscriber-port.js';

class RecordingSubscriber implements IntegrationEventSubscriberPort {
  readonly handled: OrderPlacedIntegrationEvent[] = [];

  async handle(event: OrderPlacedIntegrationEvent): Promise<void> {
    this.handled.push(event);
  }
}

describe('integration event subscribers', () => {
  it('fans out the published event to multiple subscribers', async () => {
    const readModel = new InMemoryOrderReadModel();
    const projector = new OrderSummaryProjectorSubscriber(readModel);
    const recorder = new RecordingSubscriber();
    const subscriber = new FanOutIntegrationEventSubscriber([projector, recorder]);

    await subscriber.handle({
      type: 'order.placed.v1',
      schemaVersion: 1,
      integrationEventId: 'event-1',
      occurredAt: '2030-01-01T00:00:00.000Z',
      orderId: 'order-1',
      customerId: 'customer-1',
      lines: [{ sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
      totalAmount: { amountInMinor: 2400, currency: 'JPY' },
    });

    expect(recorder.handled).toHaveLength(1);
    await expect(readModel.findById('order-1')).resolves.toEqual({
      orderId: 'order-1',
      customerId: 'customer-1',
      lines: [{ sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
      totalAmount: { amountInMinor: 2400, currency: 'JPY' },
    });
  });

  it('projects the v2 contract shape into the same read model', async () => {
    const readModel = new InMemoryOrderReadModel();
    const projector = new OrderSummaryProjectorSubscriber(readModel);

    await projector.handle({
      type: 'order.placed.v2',
      schemaVersion: 2,
      integrationEventId: 'event-2',
      occurredAt: '2030-01-01T00:00:00.000Z',
      orderId: 'order-2',
      customer: { id: 'customer-2' },
      lineItems: [{ sku: 'PEN', quantity: 3, unitPrice: { amountInMinor: 250, currency: 'JPY' } }],
      totals: { amountInMinor: 750, currency: 'JPY' },
      lineCount: 1,
    });

    await expect(readModel.findById('order-2')).resolves.toEqual({
      orderId: 'order-2',
      customerId: 'customer-2',
      lines: [{ sku: 'PEN', quantity: 3, unitPrice: { amountInMinor: 250, currency: 'JPY' } }],
      totalAmount: { amountInMinor: 750, currency: 'JPY' },
    });
  });
});
