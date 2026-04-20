import type { UnitOfWorkPort } from '../../application/ports/unit-of-work-port.js';

export class NoopUnitOfWork implements UnitOfWorkPort {
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}
