CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT,
  name          TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE github_accounts (
  id                      BIGSERIAL PRIMARY KEY,
  user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_id               BIGINT NOT NULL UNIQUE,
  login                   TEXT NOT NULL,
  access_token_encrypted  TEXT NOT NULL,
  scopes                  TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE repositories (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_repo_id      BIGINT NOT NULL,
  full_name           TEXT NOT NULL,
  default_branch      TEXT NOT NULL DEFAULT 'main',
  is_private          BOOLEAN NOT NULL DEFAULT false,
  monitoring_enabled  BOOLEAN NOT NULL DEFAULT false,
  webhook_id          BIGINT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, github_repo_id)
);

CREATE INDEX idx_repositories_user_id ON repositories(user_id);