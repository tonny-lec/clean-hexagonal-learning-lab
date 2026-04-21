import type { AuditLogEntry, AuditLogPort } from '../../application/ports/audit-log-port.js';

export class InMemoryAuditLog implements AuditLogPort {
  readonly entries: AuditLogEntry[] = [];

  async append(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }
}
