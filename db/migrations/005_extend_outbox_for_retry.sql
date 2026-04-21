ALTER TABLE outbox_messages
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE outbox_messages
  ADD COLUMN IF NOT EXISTS last_error TEXT NULL;

ALTER TABLE outbox_messages
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;

UPDATE outbox_messages
SET next_attempt_at = occurred_at
WHERE next_attempt_at IS NULL;

ALTER TABLE outbox_messages
  ALTER COLUMN next_attempt_at SET NOT NULL;

ALTER TABLE outbox_messages
  ADD COLUMN IF NOT EXISTS dead_lettered_at TIMESTAMPTZ NULL;

DROP INDEX IF EXISTS idx_outbox_messages_pending;

CREATE INDEX IF NOT EXISTS idx_outbox_messages_pending
  ON outbox_messages (next_attempt_at, occurred_at)
  WHERE published_at IS NULL AND dead_lettered_at IS NULL;
