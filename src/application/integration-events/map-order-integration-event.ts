import type { OutboxMessage } from '../ports/outbox-port.js';
import type {
  IntegrationEventVersion,
  OrderPlacedIntegrationEvent,
  OrderPlacedIntegrationEventV1,
  OrderPlacedIntegrationEventV2,
} from './order-integration-event.js';

export function toOrderPlacedIntegrationEvent(
  message: OutboxMessage,
  version: IntegrationEventVersion = 'v1',
): OrderPlacedIntegrationEvent {
  if (version === 'v2') {
    const event: OrderPlacedIntegrationEventV2 = {
      type: 'order.placed.v2',
      schemaVersion: 2,
      integrationEventId: `${message.id}-v2`,
      occurredAt: message.occurredAt,
      orderId: message.payload.orderId,
      customer: { id: message.payload.customerId },
      lineItems: message.payload.lines,
      totals: message.payload.totalAmount,
      lineCount: message.payload.lines.length,
    };

    return event;
  }

  const event: OrderPlacedIntegrationEventV1 = {
    type: 'order.placed.v1',
    schemaVersion: 1,
    integrationEventId: `${message.id}-v1`,
    occurredAt: message.occurredAt,
    orderId: message.payload.orderId,
    customerId: message.payload.customerId,
    lines: message.payload.lines,
    totalAmount: message.payload.totalAmount,
  };

  return event;
}

export function toOrderPlacedIntegrationEvents(
  message: OutboxMessage,
  versions: IntegrationEventVersion[] = ['v1'],
): OrderPlacedIntegrationEvent[] {
  return versions.map((version) => toOrderPlacedIntegrationEvent(message, version));
}
