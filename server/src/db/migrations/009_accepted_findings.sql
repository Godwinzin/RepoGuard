ALTER TABLE audit_findings
  ADD COLUMN accepted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN accepted_reason TEXT;

CREATE INDEX idx_findings_audit_fingerprint ON audit_findings (audit_id, fingerprint);

CREATE TABLE accepted_findings (
  id             BIGSERIAL PRIMARY KEY,
  repository_id  BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  fingerprint    TEXT NOT NULL,
  rule_id        TEXT NOT NULL,
  title          TEXT NOT NULL,
  file_path      TEXT,
  reason         TEXT,
  accepted_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repository_id, fingerprint)
);