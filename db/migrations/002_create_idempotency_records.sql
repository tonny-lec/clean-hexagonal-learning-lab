CREATE TABLE IF NOT EXISTS idempotency_records (
  idempotency_key TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_confirmation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
