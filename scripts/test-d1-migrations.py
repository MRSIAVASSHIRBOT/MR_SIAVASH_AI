#!/usr/bin/env python3
"""Run D1 migration contract tests against an isolated in-memory SQLite database."""

from pathlib import Path
import re
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "cloudflare" / "gateway" / "migrations"
NAME_PATTERN = re.compile(r"^(\d{4,})_[a-z0-9_]+\.sql$")


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def expect_integrity_error(connection, statement, parameters, label):
    try:
        connection.execute(statement, parameters)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(f"database did not reject invalid {label}")


def main():
    files = sorted(MIGRATIONS.glob("*.sql"))
    require(files, "no D1 migration files found")

    versions = []
    for path in files:
        match = NAME_PATTERN.fullmatch(path.name)
        require(match is not None, f"invalid migration filename: {path.name}")
        versions.append(int(match.group(1)))
    require(len(versions) == len(set(versions)), "duplicate migration version")
    require(versions == sorted(versions), "migrations are not in version order")

    expect_integrity_error(
        db,
        """INSERT INTO support_retention_runs (
            id, scheduled_time, completed_at, retention_days,
            deleted_support_tickets, deleted_idempotency_records,
            deleted_rate_limit_buckets
        ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
        ("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", now, now, 7, 0, 0, 0),
        "unsafe support retention period",
    )
    expect_integrity_error(
        db,
        """INSERT INTO support_retention_runs (
            id, scheduled_time, completed_at, retention_days,
            deleted_support_tickets, deleted_idempotency_records,
            deleted_rate_limit_buckets
        ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
        ("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", now, now, 90, -1, 0, 0),
        "negative support cleanup count",
    )

    now = "2026-11-06T10:00:00.000Z"
    later = "2026-11-07T10:00:00.000Z"
    owner_a = "11111111-1111-4111-8111-111111111111"
    owner_b = "22222222-2222-4222-8222-222222222222"
    owner_legacy = "66666666-6666-4666-8666-666666666666"
    task_a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    task_b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    task_legacy = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
    insert_task = (
        "INSERT INTO workspace_tasks "
        "(id, owner_id, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    insert_idempotency = (
        "INSERT INTO workspace_idempotency VALUES (?, ?, ?, ?, ?, ?, ?)"
    )

    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys = ON")
    for path in files:
        db.executescript(path.read_text(encoding="utf-8"))
        # Seed pre-identity records after migration 0001 to prove migration 0002
        # backfills principals and preserves tenant data while adding foreign keys.
        if path.name == "0001_workspace_tasks.sql":
            db.execute(insert_task, (
                task_legacy, owner_legacy, "Legacy task", now, later
            ))
            db.execute(insert_idempotency, (
                owner_legacy, "legacy-request-001", "a" * 64, 201,
                '{"legacy":true}', now, later
            ))

    tables = {
        row[0]
        for row in db.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }
    require({
        "users", "auth_identities", "workspace_tasks", "workspace_idempotency", "support_tickets", "support_messages", "api_rate_limits", "support_retention_runs"
    } <= tables, "identity and workspace tables were not created")

    indexes = {
        row[0]
        for row in db.execute(
            "SELECT name FROM sqlite_master WHERE type = 'index' AND name IS NOT NULL"
        )
    }
    for index in (
        "idx_auth_identities_user",
        "idx_workspace_tasks_owner_updated",
        "idx_workspace_idempotency_expiry",
        "idx_support_tickets_status_updated",
        "idx_support_messages_ticket_created",
        "idx_api_rate_limits_expiry",
        "idx_support_retention_runs_completed",
    ):
        require(index in indexes, f"required index is missing: {index}")

    legacy_user = db.execute(
        "SELECT status, created_at, updated_at FROM users WHERE id = ?",
        (owner_legacy,),
    ).fetchone()
    require(legacy_user == ("active", now, later),
            "existing workspace owner was not backfilled correctly")
    require(
        db.execute(
            "SELECT text FROM workspace_tasks WHERE id = ?", (task_legacy,)
        ).fetchone() == ("Legacy task",),
        "task data was not preserved by the identity migration",
    )
    require(
        db.execute(
            "SELECT response_body FROM workspace_idempotency "
            "WHERE owner_id = ? AND idempotency_key = ?",
            (owner_legacy, "legacy-request-001"),
        ).fetchone() == ('{"legacy":true}',),
        "idempotency data was not preserved by the identity migration",
    )

    for owner in (owner_a, owner_b):
        db.execute(
            "INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)",
            (owner, now, now),
        )

    identity_a = "33333333-3333-4333-8333-333333333333"
    identity_b = "44444444-4444-4444-8444-444444444444"
    identity_c = "55555555-5555-4555-8555-555555555555"
    db.execute(
        "INSERT INTO auth_identities VALUES (?, ?, ?, ?, ?)",
        (identity_a, owner_a, "https://issuer.example", "subject-1", now),
    )
    expect_integrity_error(
        db,
        "INSERT INTO auth_identities VALUES (?, ?, ?, ?, ?)",
        (identity_b, owner_b, "https://issuer.example", "subject-1", now),
        "duplicate issuer/subject identity",
    )
    db.execute(
        "INSERT INTO auth_identities VALUES (?, ?, ?, ?, ?)",
        (identity_c, owner_b, "https://another-issuer.example", "subject-1", now),
    )

    db.execute(insert_task, (task_a, owner_a, "Owner A task", now, now))
    db.execute(insert_task, (task_b, owner_b, "Owner B task", now, now))

    visible_to_a = db.execute(
        "SELECT id, text FROM workspace_tasks WHERE owner_id = ? "
        "ORDER BY updated_at DESC, id DESC",
        (owner_a,),
    ).fetchall()
    require(visible_to_a == [(task_a, "Owner A task")],
            "owner-scoped query returned another owner's task")

    expect_integrity_error(
        db, insert_task,
        ("not-a-valid-uuid-0000000000000000", owner_a, "Invalid ID", now, now),
        "malformed task UUID",
    )
    expect_integrity_error(
        db, insert_task,
        ("dddddddd-dddd-4ddd-8ddd-dddddddddddd", owner_a, "   ", now, now),
        "whitespace-only task text",
    )
    expect_integrity_error(
        db, insert_task,
        ("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", owner_a, "x" * 121, now, now),
        "overlong task text",
    )
    expect_integrity_error(
        db,
        "INSERT INTO workspace_tasks "
        "(id, owner_id, text, done, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        ("ffffffff-ffff-4fff-8fff-ffffffffffff", owner_a, "Invalid state", 2, now, now),
        "invalid task completion state",
    )
    expect_integrity_error(
        db, insert_task,
        ("99999999-9999-4999-8999-999999999999",
         "77777777-7777-4777-8777-777777777777", "Orphan", now, now),
        "task with an unknown owner",
    )
    expect_integrity_error(
        db, insert_task,
        ("88888888-8888-4888-8888-888888888888", owner_a, "Bad timestamp",
         "not-a-timestamp", now),
        "non-canonical task timestamp",
    )

    key = "request-key-00001"
    request_hash = "a" * 64
    response_a = '{"id":"' + task_a + '"}'
    response_b = '{"id":"' + task_b + '"}'
    db.execute(insert_idempotency, (
        owner_a, key, request_hash, 201, response_a, now, later
    ))
    # The same opaque key is valid for a different principal.
    db.execute(insert_idempotency, (
        owner_b, key, request_hash, 201, response_b, now, later
    ))
    expect_integrity_error(
        db, insert_idempotency,
        (owner_a, key, request_hash, 201, response_a, now, later),
        "duplicate idempotency key for the same owner",
    )
    expect_integrity_error(
        db, insert_idempotency,
        ("not-a-valid-uuid-0000000000000000", key, request_hash, 201, response_a, now, later),
        "malformed idempotency owner UUID",
    )
    expect_integrity_error(
        db, insert_idempotency,
        ("77777777-7777-4777-8777-777777777777", key, request_hash, 201, response_a, now, later),
        "idempotency record with an unknown owner",
    )
    expect_integrity_error(
        db, insert_idempotency,
        (owner_a, "short", request_hash, 201, response_a, now, later),
        "short idempotency key",
    )
    expect_integrity_error(
        db, insert_idempotency,
        (owner_a, "request-key-00002", "z" * 64, 201, response_a, now, later),
        "invalid request hash",
    )
    expect_integrity_error(
        db, insert_idempotency,
        (owner_a, "request-key-00003", request_hash, 201, "not-json", now, later),
        "non-JSON idempotency response",
    )
    expect_integrity_error(
        db, insert_idempotency,
        (owner_a, "request-key-00004", request_hash, 201, response_a, later, now),
        "non-positive idempotency retention interval",
    )
    expect_integrity_error(
        db, insert_idempotency,
        (owner_a, "request-key-00005", request_hash, 201, response_a,
         "not-a-timestamp", later),
        "non-canonical idempotency timestamp",
    )

    plan = " ".join(
        row[3]
        for row in db.execute(
            "EXPLAIN QUERY PLAN SELECT id, text FROM workspace_tasks "
            "WHERE owner_id = ? ORDER BY updated_at DESC, id DESC",
            (owner_a,),
        )
    )
    require("idx_workspace_tasks_owner_updated" in plan,
            "tenant listing query does not use the expected index")

    db.execute("DELETE FROM users WHERE id = ?", (owner_a,))
    for table, owner_column in (
        ("auth_identities", "user_id"),
        ("workspace_tasks", "owner_id"),
        ("workspace_idempotency", "owner_id"),
    ):
        remaining = db.execute(
            f"SELECT count(*) FROM {table} WHERE {owner_column} = ?",
            (owner_a,),
        ).fetchone()[0]
        require(remaining == 0, f"user deletion did not cascade to {table}")

    support_ticket = "aaaaaaaa-1111-4111-8111-111111111111"
    db.execute(
        "INSERT INTO support_tickets "
        "(id, ticket_code, access_token_hash, category, subject, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (support_ticket, "MS-ABC1234567", "b" * 64, "question", "Support test", now, now),
    )
    db.execute(
        "INSERT INTO support_messages (id, ticket_id, sender_role, body, created_at) "
        "VALUES (?, ?, ?, ?, ?)",
        ("bbbbbbbb-2222-4222-8222-222222222222", support_ticket, "user", "Help", now),
    )
    expect_integrity_error(
        db,
        "INSERT INTO support_messages (id, ticket_id, sender_role, body, created_at) VALUES (?, ?, ?, ?, ?)",
        ("cccccccc-3333-4333-8333-333333333333", support_ticket, "owner", "Invalid role", now),
        "invalid support sender role",
    )
    expect_integrity_error(
        db,
        "INSERT INTO support_tickets (id, ticket_code, access_token_hash, category, subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ("dddddddd-4444-4444-8444-444444444444", "MS-BAD0000000", "c" * 64, "invalid", "Bad category", now, now),
        "invalid support category",
    )
    db.execute("INSERT INTO api_rate_limits VALUES (?, ?, ?, ?)", ("d" * 64, 100, 1, 200))
    require(
        db.execute("SELECT count(*) FROM support_messages WHERE ticket_id = ?", (support_ticket,)).fetchone()[0] == 1,
        "support message relation failed",
    )
    db.execute("DELETE FROM support_tickets WHERE id = ?", (support_ticket,))
    require(
        db.execute("SELECT count(*) FROM support_messages WHERE ticket_id = ?", (support_ticket,)).fetchone()[0] == 0,
        "ticket deletion did not cascade to support messages",
    )

    require(not db.execute("PRAGMA foreign_key_check").fetchall(),
            "foreign key integrity check failed")
    require(db.execute("PRAGMA integrity_check").fetchone()[0] == "ok",
            "SQLite integrity check failed")

    print(
        "D1 migration tests passed: "
        f"{len(files)} migration(s), {len(tables)} tables, "
        f"{len(indexes)} indexes; backfill, identity uniqueness, "
        "tenant filtering, foreign keys, cascades, constraints, "
        "idempotency, support ticket constraints, message cascades, rate limits and query plan verified."
    )
    db.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # Keep CI failure concise and actionable.
        print(f"D1 migration tests failed: {error}", file=sys.stderr)
        raise
