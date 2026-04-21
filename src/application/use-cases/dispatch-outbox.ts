import type { AuditLogPort } from '../ports/audit-log-port.js';
import type { IntegrationEventPublisherPort } from '../ports/integration-event-publisher-port.js';
import type { IntegrationEventSubscriberPort } from '../ports/integration-event-subscriber-port.js';
import type { ObservabilityPort } from '../ports/observability-port.js';
import type { TelemetryContextInput } from '../ports/telemetry-context.js';
import { createTelemetryContext } from '../ports/telemetry-context.js';
import type { OrderReadModelPort } from '../ports/order-read-model-port.js';
import type { OutboxPort } from '../ports/outbox-port.js';
import { toOrderPlacedIntegrationEvents } from '../integration-events/map-order-integration-event.js';
import type { IntegrationEventVersion } from '../integration-events/order-integration-event.js';

export type DispatchOutboxCommand = {
  batchSize?: number;
  retryDelaySeconds?: number;
  maxAttempts?: number;
  now?: string;
  telemetry?: TelemetryContextInput;
  integrationEventVersions?: IntegrationEventVersion[];
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
    orderReadModel?: OrderReadModelPort;
    integrationEventSubscriber?: IntegrationEventSubscriberPort;
    observability?: ObservabilityPort;
    auditLog?: AuditLogPort;
  },
): Promise<DispatchOutboxResult> {
  const batchSize = command.batchSize ?? 100;
  const retryDelaySeconds = command.retryDelaySeconds ?? 60;
  const maxAttempts = command.maxAttempts ?? 3;
  const now = command.now ?? new Date().toISOString();
  const telemetryContext = createTelemetryContext(command.telemetry, { source: 'dispatcher' });
  const integrationEventVersions = command.integrationEventVersions ?? ['v1'];
  const pendingMessages = await dependencies.outbox.listPending(batchSize, now);

  if (pendingMessages.length === 0) {
    await dependencies.observability?.record('outbox.dispatch.completed', {
      dispatchedCount: 0,
      failedCount: 0,
      deadLetteredCount: 0,
    }, telemetryContext);
    return { dispatchedCount: 0, failedCount: 0, deadLetteredCount: 0 };
  }

  let dispatchedCount = 0;
  let failedCount = 0;
  let deadLetteredCount = 0;

  for (const message of pendingMessages) {
    const integrationEvents = toOrderPlacedIntegrationEvents(message, integrationEventVersions);
    const primaryEvent = integrationEvents[0];

    try {
      await dependencies.integrationEventPublisher.publish(integrationEvents);
    } catch (error) {
      failedCount += 1;
      const deadLettered = await handleDeliveryFailure({
        message,
        now,
        maxAttempts,
        retryDelaySeconds,
        dependencies,
        telemetryContext,
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
      }, telemetryContext);
      continue;
    }

    try {
      await dependencies.auditLog?.append({
        action: 'integration-event-published',
        aggregateId: message.aggregateId,
        payload: {
          integrationEventIds: integrationEvents.map((event) => event.integrationEventId),
          eventTypes: integrationEvents.map((event) => event.type),
          primaryEventType: primaryEvent.type,
        },
        occurredAt: now,
      });
    } catch (error) {
      await dependencies.observability?.record('outbox.audit.failed', {
        aggregateId: message.aggregateId,
        error: error instanceof Error ? error.message : 'unknown-error',
      }, telemetryContext);
    }

    try {
      if (dependencies.integrationEventSubscriber) {
        for (const event of integrationEvents) {
          await dependencies.integrationEventSubscriber.handle(event);
        }
      }
    } catch (error) {
      await dependencies.observability?.record('subscriber.delivery.blocked', {
        outboxMessageId: message.id,
        aggregateId: message.aggregateId,
        error: error instanceof Error ? error.message : 'unknown-error',
      }, telemetryContext);
      throw error;
    }
  }

  await dependencies.observability?.record('outbox.dispatch.completed', {
    dispatchedCount,
    failedCount,
    deadLetteredCount,
  }, telemetryContext);

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
  telemetryContext?: TelemetryContextInput;
  error: unknown;
}): Promise<boolean> {
  const nextRetryCount = args.message.retryCount + 1;
  const deadLettered = nextRetryCount >= args.maxAttempts;
  const telemetryContext = createTelemetryContext(args.telemetryContext, { source: 'dispatcher' });
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
      }, telemetryContext);
    }
  }

  await args.dependencies.observability?.record('outbox.dispatch.failed', {
    outboxMessageId: args.message.id,
    aggregateId: args.message.aggregateId,
    retryCount: nextRetryCount,
    deadLettered,
    error: args.error instanceof Error ? args.error.message : 'unknown-error',
  }, telemetryContext);

  return deadLettered;
}
