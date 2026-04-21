import type { AuditLogPort } from '../ports/audit-log-port.js';
import type { OrderPlacedIntegrationEvent } from '../integration-events/order-integration-event.js';
import type { NamedIntegrationEventSubscriberPort } from '../ports/named-integration-event-subscriber-port.js';
import type { ObservabilityPort } from '../ports/observability-port.js';
import type { TelemetryContextInput } from '../ports/telemetry-context.js';
import { createTelemetryContext } from '../ports/telemetry-context.js';
import type { SubscriberDeliveryFailureStorePort } from '../ports/subscriber-delivery-failure-store-port.js';
import type { SubscriberFailurePolicyPort } from '../ports/subscriber-failure-policy-port.js';

export type ReplaySubscriberFailuresCommand = {
  batchSize?: number;
  now?: string;
  telemetry?: TelemetryContextInput;
};

export type ReplaySubscriberFailuresResult = {
  replayedCount: number;
  failedCount: number;
  deadLetteredCount: number;
};

export async function replaySubscriberFailures(
  command: ReplaySubscriberFailuresCommand,
  dependencies: {
    failureStore: SubscriberDeliveryFailureStorePort;
    subscribers: NamedIntegrationEventSubscriberPort[];
    failurePolicy: SubscriberFailurePolicyPort;
    observability?: ObservabilityPort;
    auditLog?: AuditLogPort;
  },
): Promise<ReplaySubscriberFailuresResult> {
  const now = command.now ?? new Date().toISOString();
  const telemetryContext = createTelemetryContext(command.telemetry, { source: 'subscriber-replay' });
  const failures = await dependencies.failureStore.listReplayable(command.batchSize, now);

  let replayedCount = 0;
  let failedCount = 0;
  let deadLetteredCount = 0;

  for (const failure of failures) {
    const subscriber = dependencies.subscribers.find(
      (candidate) => candidate.subscriberName === failure.subscriberName,
    );

    if (!subscriber) {
      failedCount += 1;
      await markFailureForRetry({
        failure,
        now,
        errorMessage: `subscriber-not-found: ${failure.subscriberName}`,
        failureStore: dependencies.failureStore,
        failurePolicy: dependencies.failurePolicy,
        observability: dependencies.observability,
        telemetryContext: telemetryContext,
      });
      continue;
    }

    try {
      await subscriber.handle(failure.event);
      replayedCount += 1;
      await dependencies.failureStore.markResolved(failure.id, now);
      await dependencies.observability?.record('subscriber.delivery.replayed', {
        subscriberName: failure.subscriberName,
        orderId: failure.event.orderId,
      }, telemetryContext);
      await appendAuditSafely(dependencies.auditLog, dependencies.observability, {
        action: 'subscriber-delivery-replayed',
        aggregateId: failure.subscriberName,
        payload: {
          orderId: failure.event.orderId,
          integrationEventId: failure.event.integrationEventId,
        },
        occurredAt: now,
      });
    } catch (error) {
      failedCount += 1;
      const deadLettered = await markFailureForRetry({
        failure,
        now,
        errorMessage: error instanceof Error ? error.message : 'unknown-error',
        failureStore: dependencies.failureStore,
        failurePolicy: dependencies.failurePolicy,
        observability: dependencies.observability,
        telemetryContext: telemetryContext,
      });

      if (deadLettered) {
        deadLetteredCount += 1;
        await appendAuditSafely(dependencies.auditLog, dependencies.observability, {
          action: 'subscriber-delivery-dead-lettered',
          aggregateId: failure.subscriberName,
          payload: {
            orderId: failure.event.orderId,
            integrationEventId: failure.event.integrationEventId,
          },
          occurredAt: now,
        });
      }
    }
  }

  return {
    replayedCount,
    failedCount,
    deadLetteredCount,
  };
}

async function markFailureForRetry(args: {
  failure: Awaited<ReturnType<SubscriberDeliveryFailureStorePort['listReplayable']>>[number];
  now: string;
  errorMessage: string;
  failureStore: SubscriberDeliveryFailureStorePort;
  failurePolicy: SubscriberFailurePolicyPort;
  observability?: ObservabilityPort;
  telemetryContext?: TelemetryContextInput;
}): Promise<boolean> {
  const policy = args.failurePolicy.getPolicy(args.failure.subscriberName);
  const telemetryContext = createTelemetryContext(args.telemetryContext, { source: 'subscriber-replay' });
  const nextRetryCount = args.failure.retryCount + 1;
  const deadLettered = nextRetryCount >= policy.maxAttempts;
  const nextAttemptAt = deadLettered
    ? null
    : new Date(Date.parse(args.now) + policy.retryDelaySeconds * 1000).toISOString();

  await args.failureStore.markRetried(args.failure.id, {
    errorMessage: args.errorMessage,
    nextAttemptAt,
    deadLetteredAt: deadLettered ? args.now : null,
  });

  await args.observability?.record(
    deadLettered ? 'subscriber.delivery.dead-lettered' : 'subscriber.delivery.retry-scheduled',
    {
      subscriberName: args.failure.subscriberName,
      orderId: args.failure.event.orderId,
      retryCount: nextRetryCount,
      error: args.errorMessage,
    },
    telemetryContext,
  );

  return deadLettered;
}

async function appendAuditSafely(
  auditLog: AuditLogPort | undefined,
  observability: ObservabilityPort | undefined,
  entry: Parameters<AuditLogPort['append']>[0],
): Promise<void> {
  try {
    await auditLog?.append(entry);
  } catch (error) {
    await observability?.record('subscriber.delivery.audit.failed', {
      aggregateId: entry.aggregateId,
      error: error instanceof Error ? error.message : 'unknown-error',
    });
  }
}
