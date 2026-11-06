-- Provider-neutral identity and workspace foundation.
-- All timestamps are Unix epoch milliseconds (UTC).
-- Identity claims are mapped to an internal user ID only after server-side token verification.
-- Never treat a client-supplied user_id as an authorization decision.

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  created_at INTEGER NOT NULL CHECK (created_at > 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at)
);

CREATE TABLE auth_identities (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issuer TEXT NOT NULL CHECK (length(issuer) BETWEEN 1 AND 512),
  subject TEXT NOT NULL CHECK (length(subject) BETWEEN 1 AND 255),
  created_at INTEGER NOT NULL CHECK (created_at > 0),
  UNIQUE (issuer, subject)
);

CREATE INDEX auth_identities_user_id_idx
  ON auth_identities (user_id);

CREATE TABLE workspace_tasks (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (length(trim(text)) BETWEEN 1 AND 120),
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  created_at INTEGER NOT NULL CHECK (created_at > 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at)
);

-- Supports user-scoped keyset pagination ordered by creation time and stable ID.
CREATE INDEX workspace_tasks_owner_page_idx
  ON workspace_tasks (user_id, created_at, id);

CREATE TABLE idempotency_records (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_digest TEXT NOT NULL CHECK (length(key_digest) = 64),
  request_digest TEXT NOT NULL CHECK (length(request_digest) = 64),
  response_json TEXT NOT NULL CHECK (length(response_json) BETWEEN 2 AND 16384),
  created_at INTEGER NOT NULL CHECK (created_at > 0),
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  PRIMARY KEY (user_id, key_digest)
);

CREATE INDEX idempotency_records_expiry_idx
  ON idempotency_records (expires_at);
