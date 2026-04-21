import type { TelemetryContext } from './telemetry-context.js';

export type ObservabilityRecord = {
  name: string;
  attributes: Record<string, unknown>;
  context?: TelemetryContext;
  recordedAt: string;
};

export interface ObservabilityPort {
  record(
    name: string,
    attributes?: Record<string, unknown>,
    context?: TelemetryContext,
  ): Promise<void> | void;
}
