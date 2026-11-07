CREATE TABLE session (
  sid    VARCHAR NOT NULL PRIMARY KEY,
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX idx_session_expire ON session (expire);