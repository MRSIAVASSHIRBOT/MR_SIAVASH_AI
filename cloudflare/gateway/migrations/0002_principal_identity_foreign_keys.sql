-- D1 migration 0002: persist internal principals and link verified external identities.
-- Existing owner UUIDs are backfilled before workspace tables gain user foreign keys.
-- The issuer/subject pair must come only from a cryptographically verified identity token.

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL CHECK (
    length(id) = 36
    AND substr(id, 9, 1) = '-'
    AND substr(id, 14, 1) = '-'
    AND substr(id, 19, 1) = '-'
    AND substr(id, 24, 1) = '-'
    AND length(replace(id, '-', '')) = 32
    AND id NOT GLOB '*[^0-9a-f-]*'
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL CHECK (
    created_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
  ),
  updated_at TEXT NOT NULL CHECK (
    updated_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
  ),
  CHECK (updated_at >= created_at)
) STRICT;

-- Backfill principals from existing task and idempotency ownership before adding FKs.
INSERT INTO users (id, created_at, updated_at)
SELECT owner_id, MIN(created_at), MAX(updated_at)
FROM (
  SELECT owner_id, created_at, updated_at FROM workspace_tasks
  UNION ALL
  SELECT owner_id, created_at, created_at AS updated_at FROM workspace_idempotency
)
GROUP BY owner_id;

CREATE TABLE auth_identities (
  id TEXT PRIMARY KEY NOT NULL CHECK (
    length(id) = 36
    AND substr(id, 9, 1) = '-'
    AND substr(id, 14, 1) = '-'
    AND substr(id, 19, 1) = '-'
    AND substr(id, 24, 1) = '-'
    AND length(replace(id, '-', '')) = 32
    AND id NOT GLOB '*[^0-9a-f-]*'
  ),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issuer TEXT NOT NULL CHECK (length(issuer) BETWEEN 1 AND 512),
  subject TEXT NOT NULL CHECK (length(subject) BETWEEN 1 AND 255),
  created_at TEXT NOT NULL CHECK (
    created_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
  ),
  UNIQUE (issuer, subject)
) STRICT;

CREATE INDEX idx_auth_identities_user
  ON auth_identities (user_id);

-- Rebuild workspace_tasks so the principal relationship is enforced by D1.
DROP INDEX idx_workspace_tasks_owner_updated;

CREATE TABLE workspace_tasks_v2 (
  id TEXT PRIMARY KEY NOT NULL CHECK (
    length(id) = 36
    AND substr(id, 9, 1) = '-'
    AND substr(id, 14, 1) = '-'
    AND substr(id, 19, 1) = '-'
    AND substr(id, 24, 1) = '-'
    AND length(replace(id, '-', '')) = 32
    AND id NOT GLOB '*[^0-9a-f-]*'
  ),
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE CHECK (
    length(owner_id) = 36
    AND substr(owner_id, 9, 1) = '-'
    AND substr(owner_id, 14, 1) = '-'
    AND substr(owner_id, 19, 1) = '-'
    AND substr(owner_id, 24, 1) = '-'
    AND length(replace(owner_id, '-', '')) = 32
    AND owner_id NOT GLOB '*[^0-9a-f-]*'
  ),
  text TEXT NOT NULL CHECK (
    length(text) BETWEEN 1 AND 120 AND length(trim(text)) > 0
  ),
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  created_at TEXT NOT NULL CHECK (
    created_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
  ),
  updated_at TEXT NOT NULL CHECK (
    updated_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
  ),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  CHECK (updated_at >= created_at)
) STRICT;

INSERT INTO workspace_tasks_v2
  (id, owner_id, text, done, created_at, updated_at, version)
SELECT id, owner_id, text, done, created_at, updated_at, version
FROM workspace_tasks;

DROP TABLE workspace_tasks;
ALTER TABLE workspace_tasks_v2 RENAME TO workspace_tasks;

CREATE INDEX idx_workspace_tasks_owner_updated
  ON workspace_tasks (owner_id, updated_at DESC, id DESC);

-- Rebuild idempotency records with a real principal foreign key.
DROP INDEX idx_workspace_idempotency_expiry;

CREATE TABLE workspace_idempotency_v2 (
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE CHECK (
    length(owner_id) = 36
    AND substr(owner_id, 9, 1) = '-'
    AND substr(owner_id, 14, 1) = '-'
    AND substr(owner_id, 19, 1) = '-'
    AND substr(owner_id, 24, 1) = '-'
    AND length(replace(owner_id, '-', '')) = 32
    AND owner_id NOT GLOB '*[^0-9a-f-]*'
  ),
  idempotency_key TEXT NOT NULL CHECK (
    length(idempotency_key) BETWEEN 16 AND 128
  ),
  request_hash TEXT NOT NULL CHECK (
    length(request_hash) = 64 AND request_hash NOT GLOB '*[^0-9a-f]*'
  ),
  response_status INTEGER NOT NULL CHECK (response_status BETWEEN 200 AND 599),
  response_body TEXT NOT NULL CHECK (
    length(response_body) <= 16384 AND json_valid(response_body)
  ),
  created_at TEXT NOT NULL CHECK (
    created_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
  ),
  expires_at TEXT NOT NULL CHECK (
    expires_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
  ),
  PRIMARY KEY (owner_id, idempotency_key),
  CHECK (expires_at > created_at)
) STRICT;

INSERT INTO workspace_idempotency_v2
  (owner_id, idempotency_key, request_hash, response_status, response_body, created_at, expires_at)
SELECT owner_id, idempotency_key, request_hash, response_status, response_body, created_at, expires_at
FROM workspace_idempotency;

DROP TABLE workspace_idempotency;
ALTER TABLE workspace_idempotency_v2 RENAME TO workspace_idempotency;

CREATE INDEX idx_workspace_idempotency_expiry
  ON workspace_idempotency (expires_at);
