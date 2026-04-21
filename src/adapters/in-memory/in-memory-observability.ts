import type { ObservabilityPort, ObservabilityRecord } from '../../application/ports/observability-port.js';
import type { TelemetryContext } from '../../application/ports/telemetry-context.js';

export class InMemoryObservability implements ObservabilityPort {
  readonly records: ObservabilityRecord[] = [];
  readonly counters: Record<string, number> = {};

  async record(
    name: string,
    attributes: Record<string, unknown> = {},
    context?: TelemetryContext,
  ): Promise<void> {
    this.counters[name] = (this.counters[name] ?? 0) + 1;
    this.records.push({
      name,
      attributes,
      ...(context ? { context } : {}),
      recordedAt: new Date().toISOString(),
    });
  }
}
