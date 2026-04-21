export type TransactionContext = unknown;

export interface UnitOfWorkPort {
  runInTransaction<T>(work: (transaction: TransactionContext) => Promise<T>): Promise<T>;
}
