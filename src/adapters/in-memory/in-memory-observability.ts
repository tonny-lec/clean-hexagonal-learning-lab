import type { ObservabilityPort, ObservabilityRecord } from '../../application/ports/observability-port.js';

export class InMemoryObservability implements ObservabilityPort {
  readonly records: ObservabilityRecord[] = [];

  async record(name: string, attributes: Record<string, unknown> = {}): Promise<void> {
    this.records.push({
      name,
      attributes,
      recordedAt: new Date().toISOString(),
    });
  }
}
