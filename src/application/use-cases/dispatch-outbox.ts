import type { OrderSummaryDto } from '../dto/order-dto.js';
import type { AuditLogPort } from '../ports/audit-log-port.js';
import type { IntegrationEventPublisherPort } from '../ports/integration-event-publisher-port.js';
import type { ObservabilityPort } from '../ports/observability-port.js';
import type { OrderReadModelPort } from '../ports/order-read-model-port.js';
import type { OutboxPort } from '../ports/outbox-port.js';
import { toOrderPlacedIntegrationEvent } from '../integration-events/map-order-integration-event.js';

export type DispatchOutboxCommand = {
  batchSize?: number;
  retryDelaySeconds?: number;
  maxAttempts?: number;
  now?: string;
};

export type DispatchOutboxResult = {
  dispatchedCount: number;
  failedCount: number;
  deadLetteredCount: number;
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
  const retryDelaySeconds = command.retryDelaySeconds ?? 60;
  const maxAttempts = command.maxAttempts ?? 3;
  const now = command.now ?? new Date().toISOString();
  const pendingMessages = await dependencies.outbox.listPending(batchSize, now);

  if (pendingMessages.length === 0) {
    await dependencies.observability?.record('outbox.dispatch.completed', {
      dispatchedCount: 0,
      failedCount: 0,
      deadLetteredCount: 0,
    });
    return { dispatchedCount: 0, failedCount: 0, deadLetteredCount: 0 };
  }

  let dispatchedCount = 0;
  let failedCount = 0;
  let deadLetteredCount = 0;

  for (const message of pendingMessages) {
    const integrationEvent = toOrderPlacedIntegrationEvent(message);
    const summary: OrderSummaryDto = {
      orderId: integrationEvent.orderId,
      customerId: integrationEvent.customerId,
      lines: integrationEvent.lines,
      totalAmount: integrationEvent.totalAmount,
    };

    try {
      await dependencies.orderReadModel.upsert(summary);
    } catch (error) {
      failedCount += 1;
      await dependencies.observability?.record('outbox.projection.failed', {
        outboxMessageId: message.id,
        aggregateId: message.aggregateId,
        error: error instanceof Error ? error.message : 'unknown-error',
      });
      const deadLettered = await handleDeliveryFailure({
        message,
        now,
        maxAttempts,
        retryDelaySeconds,
        dependencies,
        error,
      });
      if (deadLettered) {
        deadLetteredCount += 1;
      }
      continue;
    }

    try {
      await dependencies.integrationEventPublisher.publish([integrationEvent]);
    } catch (error) {
      failedCount += 1;
      const deadLettered = await handleDeliveryFailure({
        message,
        now,
        maxAttempts,
        retryDelaySeconds,
        dependencies,
        error,
      });
      if (deadLettered) {
        deadLetteredCount += 1;
      }
      continue;
    }

    try {
      await dependencies.outbox.markAsPublished([message.id]);
      dispatchedCount += 1;
    } catch (error) {
      dispatchedCount += 1;
      deadLetteredCount += 1;

      await dependencies.outbox.markAsFailed(message.id, {
        errorMessage: error instanceof Error ? `publish-succeeded-but-ack-failed: ${error.message}` : 'publish-succeeded-but-ack-failed',
        nextAttemptAt: null,
        deadLetteredAt: now,
      });
      await dependencies.observability?.record('outbox.acknowledgement.failed', {
        outboxMessageId: message.id,
        aggregateId: message.aggregateId,
        error: error instanceof Error ? error.message : 'unknown-error',
      });
      continue;
    }

    try {
      await dependencies.auditLog?.append({
        action: 'integration-event-published',
        aggregateId: integrationEvent.orderId,
        payload: {
          integrationEventId: integrationEvent.integrationEventId,
          eventType: integrationEvent.type,
        },
        occurredAt: now,
      });
    } catch (error) {
      await dependencies.observability?.record('outbox.audit.failed', {
        aggregateId: message.aggregateId,
        error: error instanceof Error ? error.message : 'unknown-error',
      });
    }
  }

  await dependencies.observability?.record('outbox.dispatch.completed', {
    dispatchedCount,
    failedCount,
    deadLetteredCount,
  });

  return {
    dispatchedCount,
    failedCount,
    deadLetteredCount,
  };
}

async function handleDeliveryFailure(args: {
  message: Awaited<ReturnType<OutboxPort['listPending']>>[number];
  now: string;
  maxAttempts: number;
  retryDelaySeconds: number;
  dependencies: {
    outbox: OutboxPort;
    observability?: ObservabilityPort;
    auditLog?: AuditLogPort;
  };
  error: unknown;
}): Promise<boolean> {
  const nextRetryCount = args.message.retryCount + 1;
  const deadLettered = nextRetryCount >= args.maxAttempts;
  const nextAttemptAt = deadLettered ? null : new Date(Date.parse(args.now) + args.retryDelaySeconds * 1000).toISOString();

  await args.dependencies.outbox.markAsFailed(args.message.id, {
    errorMessage: args.error instanceof Error ? args.error.message : 'unknown-error',
    nextAttemptAt,
    deadLetteredAt: deadLettered ? args.now : null,
  });

  if (deadLettered) {
    try {
      await args.dependencies.auditLog?.append({
        action: 'outbox-message-dead-lettered',
        aggregateId: args.message.aggregateId,
        payload: {
          outboxMessageId: args.message.id,
          retryCount: nextRetryCount,
          error: args.error instanceof Error ? args.error.message : 'unknown-error',
        },
        occurredAt: args.now,
      });
    } catch (auditError) {
      await args.dependencies.observability?.record('outbox.audit.failed', {
        aggregateId: args.message.aggregateId,
        error: auditError instanceof Error ? auditError.message : 'unknown-error',
      });
    }
  }

  await args.dependencies.observability?.record('outbox.dispatch.failed', {
    outboxMessageId: args.message.id,
    aggregateId: args.message.aggregateId,
    retryCount: nextRetryCount,
    deadLettered,
    error: args.error instanceof Error ? args.error.message : 'unknown-error',
  });

  return deadLettered;
}
