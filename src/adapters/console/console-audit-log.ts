import type { AuditLogEntry, AuditLogPort } from '../../application/ports/audit-log-port.js';

export class ConsoleAuditLog implements AuditLogPort {
  async append(entry: AuditLogEntry): Promise<void> {
    console.log(`[audit] ${entry.action} ${entry.aggregateId} ${JSON.stringify(entry.payload)}`);
  }
}
