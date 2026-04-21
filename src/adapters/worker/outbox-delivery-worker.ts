import type { AuditLogPort } from '../../application/ports/audit-log-port.js';
import type { ObservabilityPort } from '../../application/ports/observability-port.js';
import { createTelemetryContext } from '../../application/ports/telemetry-context.js';
import type { PollOutboxCommand, PollOutboxResult } from '../../application/use-cases/poll-outbox.js';
import type { DeliveryTriggerConsumer, DeliveryTriggerKind } from './delivery-trigger-consumer.js';

export type DeliveryWorkerRunResult =
  | { status: 'idle' }
  | {
      status: 'processed';
      triggerId: string;
      triggerKind: DeliveryTriggerKind;
      pollResult: PollOutboxResult;
    }
  | {
      status: 'failed';
      triggerId: string;
      triggerKind: DeliveryTriggerKind;
      error: string;
    };

export type DeliveryWorkerRunUntilIdleResult = {
  processedCount: number;
  failedCount: number;
  runs: Exclude<DeliveryWorkerRunResult, { status: 'idle' }>[];
};

export class OutboxDeliveryWorker {
  constructor(
    private readonly dependencies: {
      triggerConsumer: DeliveryTriggerConsumer;
      runPollOutbox: (command: PollOutboxCommand) => Promise<PollOutboxResult>;
      observability?: ObservabilityPort;
      auditLog?: AuditLogPort;
    },
  ) {}

  async runOnce(defaultCommand: PollOutboxCommand = {}): Promise<DeliveryWorkerRunResult> {
    const trigger = await this.dependencies.triggerConsumer.reserveNext();

    if (!trigger) {
      await this.dependencies.observability?.record('delivery-worker.idle');
      return { status: 'idle' };
    }

    const telemetryContext = createTelemetryContext(trigger.command.telemetry, {
      source: 'worker',
      correlationId: trigger.correlationId ?? trigger.id,
      traceId: trigger.traceId,
    });
    const command = mergePollCommand(defaultCommand, trigger.command, telemetryContext);

    try {
      const pollResult = await this.dependencies.runPollOutbox(command);
      await this.dependencies.triggerConsumer.acknowledge(trigger.id);
      await this.dependencies.observability?.record('delivery-worker.processed', {
        triggerId: trigger.id,
        triggerKind: trigger.kind,
        totalCycles: pollResult.totalCycles,
      }, telemetryContext);
      await appendAuditSafely(this.dependencies.auditLog, this.dependencies.observability, {
        action: 'delivery-worker-processed',
        aggregateId: trigger.id,
        payload: {
          triggerKind: trigger.kind,
          totalCycles: pollResult.totalCycles,
        },
        occurredAt: trigger.requestedAt,
      });

      return {
        status: 'processed',
        triggerId: trigger.id,
        triggerKind: trigger.kind,
        pollResult,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown-error';
      await this.dependencies.triggerConsumer.release(trigger.id, reason);
      await this.dependencies.observability?.record('delivery-worker.failed', {
        triggerId: trigger.id,
        triggerKind: trigger.kind,
        error: reason,
      }, telemetryContext);
      await appendAuditSafely(this.dependencies.auditLog, this.dependencies.observability, {
        action: 'delivery-worker-failed',
        aggregateId: trigger.id,
        payload: {
          triggerKind: trigger.kind,
          error: reason,
        },
        occurredAt: trigger.requestedAt,
      });

      return {
        status: 'failed',
        triggerId: trigger.id,
        triggerKind: trigger.kind,
        error: reason,
      };
    }
  }

  async runUntilIdle(args: { defaultCommand?: PollOutboxCommand; maxRuns?: number } = {}): Promise<DeliveryWorkerRunUntilIdleResult> {
    const maxRuns = args.maxRuns ?? 10;
    const runs: DeliveryWorkerRunUntilIdleResult['runs'] = [];
    let processedCount = 0;
    let failedCount = 0;

    for (let index = 0; index < maxRuns; index += 1) {
      const result = await this.runOnce(args.defaultCommand);
      if (result.status === 'idle') {
        break;
      }

      runs.push(result);
      if (result.status === 'processed') {
        processedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    return {
      processedCount,
      failedCount,
      runs,
    };
  }
}

function mergePollCommand(
  defaultCommand: PollOutboxCommand,
  commandFromTrigger: PollOutboxCommand,
  telemetryContext = createTelemetryContext(undefined, { source: 'worker' }),
): PollOutboxCommand {
  return {
    ...defaultCommand,
    ...commandFromTrigger,
    telemetry: createTelemetryContext(commandFromTrigger.telemetry, telemetryContext ?? defaultCommand.telemetry),
    integrationEventVersions: commandFromTrigger.integrationEventVersions ?? defaultCommand.integrationEventVersions,
  };
}

async function appendAuditSafely(
  auditLog: AuditLogPort | undefined,
  observability: ObservabilityPort | undefined,
  entry: Parameters<AuditLogPort['append']>[0],
): Promise<void> {
  try {
    await auditLog?.append(entry);
  } catch (error) {
    await observability?.record('delivery-worker.audit.failed', {
      aggregateId: entry.aggregateId,
      error: error instanceof Error ? error.message : 'unknown-error',
    });
  }
}
