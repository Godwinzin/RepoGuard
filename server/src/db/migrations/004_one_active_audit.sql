CREATE UNIQUE INDEX one_active_audit_per_repo
  ON audits (repository_id)
  WHERE status IN ('queued', 'running');