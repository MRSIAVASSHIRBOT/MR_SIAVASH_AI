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

    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys = ON")
    for path in files:
        db.executescript(path.read_text(encoding="utf-8"))

    tables = {
        row[0]
        for row in db.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }
    require({"workspace_tasks", "workspace_idempotency"} <= tables,
            "workspace tables were not created")

    indexes = {
        row[0]
        for row in db.execute(
            "SELECT name FROM sqlite_master WHERE type = 'index' AND name IS NOT NULL"
        )
    }
    require("idx_workspace_tasks_owner_updated" in indexes,
            "tenant listing index is missing")
    require("idx_workspace_idempotency_expiry" in indexes,
            "idempotency expiry index is missing")

    now = "2026-11-06T10:00:00.000Z"
    later = "2026-11-07T10:00:00.000Z"
    owner_a = "11111111-1111-4111-8111-111111111111"
    owner_b = "22222222-2222-4222-8222-222222222222"
    task_a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    task_b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    insert_task = (
        "INSERT INTO workspace_tasks "
        "(id, owner_id, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
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
        ("cccccccc-cccc-4ccc-8ccc-cccccccccccc", owner_a, "   ", now, now),
        "whitespace-only task text",
    )
    expect_integrity_error(
        db, insert_task,
        ("dddddddd-dddd-4ddd-8ddd-dddddddddddd", owner_a, "x" * 121, now, now),
        "overlong task text",
    )
    expect_integrity_error(
        db,
        "INSERT INTO workspace_tasks "
        "(id, owner_id, text, done, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        ("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", owner_a, "Invalid state", 2, now, now),
        "invalid task completion state",
    )

    key = "request-key-00001"
    request_hash = "a" * 64
    insert_idempotency = (
        "INSERT INTO workspace_idempotency VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
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
    require(db.execute("PRAGMA integrity_check").fetchone()[0] == "ok",
            "SQLite integrity check failed")

    print(
        "D1 migration tests passed: "
        f"{len(files)} migration(s), {len(tables)} tables, "
        f"{len(indexes)} indexes; tenant filtering, constraints, "
        "idempotency uniqueness, expiry and query plan verified."
    )
    db.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # Keep CI failure concise and actionable.
        print(f"D1 migration tests failed: {error}", file=sys.stderr)
        raise
