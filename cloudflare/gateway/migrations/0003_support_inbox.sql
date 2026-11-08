-- Support inbox, private ticket credentials and hashed-IP rate limits.
CREATE TABLE support_tickets (
 id TEXT PRIMARY KEY NOT NULL,
 ticket_code TEXT NOT NULL UNIQUE CHECK(length(ticket_code) BETWEEN 8 AND 20),
 access_token_hash TEXT NOT NULL CHECK(length(access_token_hash)=64 AND access_token_hash NOT GLOB '*[^0-9a-f]*'),
 category TEXT NOT NULL CHECK(category IN ('question','suggestion','complaint','bug','other')),
 subject TEXT NOT NULL CHECK(length(trim(subject)) BETWEEN 1 AND 120),
 contact_email TEXT CHECK(contact_email IS NULL OR length(contact_email)<=254),
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','waiting_user','resolved')),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL CHECK(updated_at>=created_at)
) STRICT;
CREATE TABLE support_messages (
 id TEXT PRIMARY KEY NOT NULL,
 ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
 sender_role TEXT NOT NULL CHECK(sender_role IN ('user','assistant','admin')),
 body TEXT NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 4000),
 created_at TEXT NOT NULL
) STRICT;
CREATE INDEX idx_support_tickets_status_updated ON support_tickets(status,updated_at DESC,id DESC);
CREATE INDEX idx_support_messages_ticket_created ON support_messages(ticket_id,created_at ASC,id ASC);
CREATE TABLE api_rate_limits (
 bucket TEXT PRIMARY KEY NOT NULL CHECK(length(bucket)=64 AND bucket NOT GLOB '*[^0-9a-f]*'),
 window_started_at INTEGER NOT NULL,
 request_count INTEGER NOT NULL CHECK(request_count BETWEEN 1 AND 1000),
 expires_at INTEGER NOT NULL CHECK(expires_at>window_started_at)
) STRICT;
CREATE INDEX idx_api_rate_limits_expiry ON api_rate_limits(expires_at);
