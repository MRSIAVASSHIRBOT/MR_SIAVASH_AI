CREATE TABLE support_retention_runs (
 id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
 scheduled_time TEXT,
 completed_at TEXT NOT NULL,
 retention_days INTEGER NOT NULL CHECK(retention_days BETWEEN 30 AND 365),
 deleted_support_tickets INTEGER NOT NULL CHECK(deleted_support_tickets >= 0),
 deleted_idempotency_records INTEGER NOT NULL CHECK(deleted_idempotency_records >= 0),
 deleted_rate_limit_buckets INTEGER NOT NULL CHECK(deleted_rate_limit_buckets >= 0)
) STRICT;
CREATE INDEX idx_support_retention_runs_completed
 ON support_retention_runs(completed_at DESC, id DESC);
