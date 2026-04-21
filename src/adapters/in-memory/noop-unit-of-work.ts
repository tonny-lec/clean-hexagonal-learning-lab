import type { UnitOfWorkPort, TransactionContext } from '../../application/ports/unit-of-work-port.js';

export class NoopUnitOfWork implements UnitOfWorkPort {
  async runInTransaction<T>(work: (transaction: TransactionContext) => Promise<T>): Promise<T> {
    return work(undefined);
  }
}
