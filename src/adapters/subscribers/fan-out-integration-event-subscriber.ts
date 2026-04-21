import type { OrderPlacedIntegrationEvent } from '../../application/integration-events/order-integration-event.js';
import type { AuditLogPort } from '../../application/ports/audit-log-port.js';
import type { IntegrationEventSubscriberPort } from '../../application/ports/integration-event-subscriber-port.js';
import type { NamedIntegrationEventSubscriberPort } from '../../application/ports/named-integration-event-subscriber-port.js';
import type { ObservabilityPort } from '../../application/ports/observability-port.js';
import type { SubscriberDeliveryFailureStorePort } from '../../application/ports/subscriber-delivery-failure-store-port.js';
import type { SubscriberFailurePolicyPort } from '../../application/ports/subscriber-failure-policy-port.js';

export class FanOutIntegrationEventSubscriber implements IntegrationEventSubscriberPort {
  readonly subscriberName = 'fan-out-subscriber';

  constructor(
    private readonly subscribers: NamedIntegrationEventSubscriberPort[],
    private readonly options?: {
      failureStore?: SubscriberDeliveryFailureStorePort;
      failurePolicy?: SubscriberFailurePolicyPort;
      observability?: ObservabilityPort;
      auditLog?: AuditLogPort;
      now?: () => string;
    },
  ) {}

  async handle(event: OrderPlacedIntegrationEvent): Promise<void> {
    for (const subscriber of this.subscribers) {
      try {
        await subscriber.handle(event);
      } catch (error) {
        if (!this.options?.failureStore || !this.options.failurePolicy) {
          throw error;
        }

        const now = this.options.now?.() ?? new Date().toISOString();
        const policy = this.options.failurePolicy.getPolicy(subscriber.subscriberName);
        const deadLettered = policy.maxAttempts <= 1;
        const nextAttemptAt = deadLettered
          ? null
          : new Date(Date.parse(now) + policy.retryDelaySeconds * 1000).toISOString();

        await this.options.failureStore.recordFailure({
          subscriberName: subscriber.subscriberName,
          event,
          failedAt: now,
          errorMessage: error instanceof Error ? error.message : 'unknown-error',
          nextAttemptAt,
          deadLetteredAt: deadLettered ? now : null,
        });
        await this.options.observability?.record(
          deadLettered ? 'subscriber.delivery.dead-lettered' : 'subscriber.delivery.failed',
          {
            subscriberName: subscriber.subscriberName,
            orderId: event.orderId,
            error: error instanceof Error ? error.message : 'unknown-error',
          },
        );

        if (deadLettered) {
          await appendAuditSafely(this.options.auditLog, this.options.observability, {
            action: 'subscriber-delivery-dead-lettered',
            aggregateId: subscriber.subscriberName,
            payload: {
              orderId: event.orderId,
              integrationEventId: event.integrationEventId,
            },
            occurredAt: now,
          });
        }
      }
    }
  }
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
