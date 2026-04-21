export type ObservabilityRecord = {
  name: string;
  attributes: Record<string, unknown>;
  recordedAt: string;
};

export interface ObservabilityPort {
  record(name: string, attributes?: Record<string, unknown>): Promise<void> | void;
}
