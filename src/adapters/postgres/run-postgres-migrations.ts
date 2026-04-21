import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Queryable = {
  query(text: string): Promise<unknown>;
};

export async function runPostgresMigrations(db: Queryable): Promise<void> {
  const migrationDir = resolve(process.cwd(), 'db/migrations');
  const files = [
    '001_create_orders.sql',
    '002_create_idempotency_records.sql',
    '003_create_outbox.sql',
  ];

  for (const file of files) {
    const sql = readFileSync(resolve(migrationDir, file), 'utf8');
    await db.query(sql);
  }
}
