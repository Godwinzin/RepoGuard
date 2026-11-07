ALTER TABLE audits
  ADD COLUMN triggered_by TEXT NOT NULL DEFAULT 'manual'
  CHECK (triggered_by IN ('manual', 'push'));

CREATE TABLE webhook_events (
  id             BIGSERIAL PRIMARY KEY,
  delivery_id    TEXT NOT NULL UNIQUE,
  event_type     TEXT NOT NULL,
  hook_id        BIGINT,
  repository_id  BIGINT REFERENCES repositories(id) ON DELETE SET NULL,
  ref            TEXT,
  commit_sha     TEXT,
  outcome        TEXT NOT NULL,
  received_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id  BIGINT REFERENCES repositories(id) ON DELETE CASCADE,
  audit_id       BIGINT REFERENCES audits(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);