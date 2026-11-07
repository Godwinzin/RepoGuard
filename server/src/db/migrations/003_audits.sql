CREATE TABLE audits (
  id             BIGSERIAL PRIMARY KEY,
  repository_id  BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  commit_sha     TEXT,
  status         TEXT NOT NULL DEFAULT 'queued'
                 CHECK (status IN ('queued', 'running', 'done', 'failed')),
  score          INTEGER,
  error_message  TEXT,
  started_at     TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_findings (
  id           BIGSERIAL PRIMARY KEY,
  audit_id     BIGINT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  rule_id      TEXT NOT NULL,
  category     TEXT NOT NULL,
  severity     TEXT NOT NULL
               CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  fix          TEXT NOT NULL,
  file_path    TEXT,
  fingerprint  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audits_repository_id ON audits(repository_id);
CREATE INDEX idx_findings_audit_id ON audit_findings(audit_id);