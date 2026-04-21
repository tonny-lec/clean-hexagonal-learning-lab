import type { OutboxMessage } from '../ports/outbox-port.js';
import type { OrderPlacedIntegrationEvent } from './order-integration-event.js';

export function toOrderPlacedIntegrationEvent(message: OutboxMessage): OrderPlacedIntegrationEvent {
  return {
    type: 'order.placed.v1',
    integrationEventId: message.id,
    occurredAt: message.occurredAt,
    orderId: message.payload.orderId,
    customerId: message.payload.customerId,
    lines: message.payload.lines,
    totalAmount: message.payload.totalAmount,
  };
}
