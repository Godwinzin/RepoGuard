-- Delete a repository's webhook records together with the repository
ALTER TABLE webhook_events
  DROP CONSTRAINT webhook_events_repository_id_fkey;

ALTER TABLE webhook_events
  ADD CONSTRAINT webhook_events_repository_id_fkey
  FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE;