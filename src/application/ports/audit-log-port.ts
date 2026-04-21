export type AuditLogEntry = {
  action: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  occurredAt: string;
};

export interface AuditLogPort {
  append(entry: AuditLogEntry): Promise<void> | void;
}
