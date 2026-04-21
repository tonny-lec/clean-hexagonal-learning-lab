CREATE TABLE IF NOT EXISTS outbox_messages (
  id UUID PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_messages_pending
  ON outbox_messages (occurred_at)
  WHERE published_at IS NULL;
