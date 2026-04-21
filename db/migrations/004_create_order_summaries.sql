CREATE TABLE IF NOT EXISTS order_summaries (
  order_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  lines_json JSONB NOT NULL,
  total_amount_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
