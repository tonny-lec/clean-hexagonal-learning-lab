import type { OrderSummaryDto } from '../dto/order-dto.js';
import type { AuditLogPort } from '../ports/audit-log-port.js';
import type { IntegrationEventPublisherPort } from '../ports/integration-event-publisher-port.js';
import type { ObservabilityPort } from '../ports/observability-port.js';
import type { OrderReadModelPort } from '../ports/order-read-model-port.js';
import type { OutboxPort } from '../ports/outbox-port.js';
import { toOrderPlacedIntegrationEvent } from '../integration-events/map-order-integration-event.js';

export type DispatchOutboxCommand = {
  batchSize?: number;
};

export type DispatchOutboxResult = {
  dispatchedCount: number;
};

export async function dispatchOutbox(
  command: DispatchOutboxCommand,
  dependencies: {
    outbox: OutboxPort;
    integrationEventPublisher: IntegrationEventPublisherPort;
    orderReadModel: OrderReadModelPort;
    observability?: ObservabilityPort;
    auditLog?: AuditLogPort;
  },
): Promise<DispatchOutboxResult> {
  const batchSize = command.batchSize ?? 100;
  const pendingMessages = await dependencies.outbox.listPending(batchSize);

  if (pendingMessages.length === 0) {
    await dependencies.observability?.record('outbox.dispatch.completed', {
      dispatchedCount: 0,
    });
    return { dispatchedCount: 0 };
  }

  for (const message of pendingMessages) {
    const integrationEvent = toOrderPlacedIntegrationEvent(message);
    await dependencies.integrationEventPublisher.publish([integrationEvent]);

    const summary: OrderSummaryDto = {
      orderId: integrationEvent.orderId,
      customerId: integrationEvent.customerId,
      lines: integrationEvent.lines,
      totalAmount: integrationEvent.totalAmount,
    };

    await dependencies.orderReadModel.upsert(summary);
    await dependencies.auditLog?.append({
      action: 'integration-event-published',
      aggregateId: integrationEvent.orderId,
      payload: {
        integrationEventId: integrationEvent.integrationEventId,
        eventType: integrationEvent.type,
      },
      occurredAt: new Date().toISOString(),
    });
  }

  await dependencies.outbox.markAsPublished(pendingMessages.map((message) => message.id));
  await dependencies.observability?.record('outbox.dispatch.completed', {
    dispatchedCount: pendingMessages.length,
  });

  return {
    dispatchedCount: pendingMessages.length,
  };
}
