import type { ObservabilityPort } from '../../application/ports/observability-port.js';
import type { TelemetryContext } from '../../application/ports/telemetry-context.js';

export class ConsoleObservability implements ObservabilityPort {
  private readonly counters: Record<string, number> = {};

  async record(
    name: string,
    attributes: Record<string, unknown> = {},
    context?: TelemetryContext,
  ): Promise<void> {
    this.counters[name] = (this.counters[name] ?? 0) + 1;

    console.log(
      JSON.stringify({
        kind: 'telemetry',
        name,
        attributes,
        ...(context ? { context } : {}),
        metrics: { ...this.counters },
        recordedAt: new Date().toISOString(),
      }),
    );
  }
}
