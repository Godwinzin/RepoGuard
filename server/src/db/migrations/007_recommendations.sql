CREATE TABLE recommendations (
  id             BIGSERIAL PRIMARY KEY,
  audit_id       BIGINT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('env_example', 'readme')),
  status         TEXT NOT NULL DEFAULT 'queued'
                 CHECK (status IN ('queued', 'running', 'done', 'failed')),
  content        TEXT,
  model          TEXT,
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ,
  UNIQUE (audit_id, type)
);

-- One row per request, used for daily quotas
CREATE TABLE ai_usage (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_user ON ai_usage (user_id, created_at DESC);