import type { AuditLogPort } from '../ports/audit-log-port.js';
import type { IntegrationEventPublisherPort } from '../ports/integration-event-publisher-port.js';
import type { IntegrationEventSubscriberPort } from '../ports/integration-event-subscriber-port.js';
import type { IntegrationEventVersion } from '../integration-events/order-integration-event.js';
import type { ObservabilityPort } from '../ports/observability-port.js';
import type { TelemetryContextInput } from '../ports/telemetry-context.js';
import type { OrderReadModelPort } from '../ports/order-read-model-port.js';
import type { OutboxPort } from '../ports/outbox-port.js';
import { dispatchOutbox, type DispatchOutboxResult } from './dispatch-outbox.js';

export type PollOutboxCommand = {
  batchSize?: number;
  retryDelaySeconds?: number;
  maxAttempts?: number;
  cycles?: number;
  startAt?: string;
  stepSeconds?: number;
  telemetry?: TelemetryContextInput;
  integrationEventVersions?: IntegrationEventVersion[];
};

export type PollOutboxResult = {
  totalCycles: number;
  history: Array<DispatchOutboxResult & { cycle: number }>;
};

export async function pollOutbox(
  command: PollOutboxCommand,
  dependencies: {
    outbox: OutboxPort;
    integrationEventPublisher: IntegrationEventPublisherPort;
    orderReadModel?: OrderReadModelPort;
    integrationEventSubscriber?: IntegrationEventSubscriberPort;
    observability?: ObservabilityPort;
    auditLog?: AuditLogPort;
  },
): Promise<PollOutboxResult> {
  const cycles = command.cycles ?? 3;
  const stepSeconds = command.stepSeconds ?? 60;
  const startAt = command.startAt ?? new Date().toISOString();
  const history: PollOutboxResult['history'] = [];
  const horizon = new Date(Date.parse(startAt) + Math.max(cycles - 1, 0) * stepSeconds * 1000).toISOString();

  for (let index = 0; index < cycles; index += 1) {
    const now = new Date(Date.parse(startAt) + index * stepSeconds * 1000).toISOString();
    const result = await dispatchOutbox(
      {
        batchSize: command.batchSize,
        retryDelaySeconds: command.retryDelaySeconds,
        maxAttempts: command.maxAttempts,
        now,
        telemetry: command.telemetry,
        integrationEventVersions: command.integrationEventVersions,
      },
      dependencies,
    );

    history.push({ cycle: index + 1, ...result });

    const remainingWorkWithinHorizon = await dependencies.outbox.listPending(command.batchSize, horizon);
    if (remainingWorkWithinHorizon.length === 0) {
      break;
    }
  }

  return {
    totalCycles: history.length,
    history,
  };
}
