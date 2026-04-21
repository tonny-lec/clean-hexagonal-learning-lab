import type { QueryResult, QueryResultRow } from 'pg';
import type { TransactionContext, UnitOfWorkPort } from '../../application/ports/unit-of-work-port.js';

type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
};

export class PostgresUnitOfWork implements UnitOfWorkPort {
  constructor(private readonly db: Queryable) {}

  async runInTransaction<T>(work: (transaction: TransactionContext) => Promise<T>): Promise<T> {
    await this.db.query('BEGIN');

    try {
      const result = await work(this.db);
      await this.db.query('COMMIT');
      return result;
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }
}
