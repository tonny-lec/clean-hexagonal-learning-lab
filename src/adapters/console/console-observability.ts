import type { ObservabilityPort } from '../../application/ports/observability-port.js';

export class ConsoleObservability implements ObservabilityPort {
  async record(name: string, attributes: Record<string, unknown> = {}): Promise<void> {
    console.log(`[obs] ${name} ${JSON.stringify(attributes)}`);
  }
}
