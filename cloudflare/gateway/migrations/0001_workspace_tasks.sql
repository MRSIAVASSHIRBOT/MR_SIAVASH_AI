-- D1 migration 0001: tenant-scoped workspace tasks and bounded idempotency records.
-- owner_id is an internal principal UUID assigned by the trusted auth adapter.
-- Never populate owner_id from request JSON, query parameters, or an unverified token claim.

CREATE TABLE workspace_tasks (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36     AND substr(id, 9, 1) = '-'     AND substr(id, 14, 1) = '-'     AND substr(id, 19, 1) = '-'     AND substr(id, 24, 1) = '-'     AND length(replace(id, '-', '')) = 32     AND id NOT GLOB '*[^0-9a-f-]*'),
  owner_id TEXT NOT NULL CHECK (length(owner_id) = 36     AND substr(owner_id, 9, 1) = '-'     AND substr(owner_id, 14, 1) = '-'     AND substr(owner_id, 19, 1) = '-'     AND substr(owner_id, 24, 1) = '-'     AND length(replace(owner_id, '-', '')) = 32     AND owner_id NOT GLOB '*[^0-9a-f-]*'),
  text TEXT NOT NULL CHECK (
    length(text) BETWEEN 1 AND 120 AND length(trim(text)) > 0
  ),
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  created_at TEXT NOT NULL CHECK (length(created_at) = 24),
  updated_at TEXT NOT NULL CHECK (length(updated_at) = 24),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
) STRICT;

-- Supports tenant-scoped, stable task listing without scanning other owners.
CREATE INDEX idx_workspace_tasks_owner_updated
  ON workspace_tasks (owner_id, updated_at DESC, id DESC);

-- Idempotency is scoped to the authenticated owner, not globally to a key.
-- The application must enforce expiry and periodically delete expired rows.
CREATE TABLE workspace_idempotency (
  owner_id TEXT NOT NULL CHECK (length(owner_id) = 36),
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
  created_at TEXT NOT NULL CHECK (length(created_at) = 24),
  expires_at TEXT NOT NULL CHECK (length(expires_at) = 24),
  PRIMARY KEY (owner_id, idempotency_key),
  CHECK (expires_at > created_at)
) STRICT;

CREATE INDEX idx_workspace_idempotency_expiry
  ON workspace_idempotency (expires_at);
