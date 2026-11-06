#!/usr/bin/env python3
"""Validate the provider-neutral D1 schema using Python's in-memory SQLite engine."""

from pathlib import Path
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "cloudflare" / "gateway" / "migrations" / "0001_identity_workspace.sql"


class D1MigrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sql = MIGRATION.read_text(encoding="utf-8")

    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(self.sql)

    def tearDown(self):
        self.db.close()

    def add_user(self, user_id, timestamp=1_800_000_000_000):
        self.db.execute(
            "INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)",
            (user_id, timestamp, timestamp),
        )

    def test_migration_file_exists_and_is_nonempty(self):
        self.assertTrue(MIGRATION.is_file())
        self.assertGreater(len(self.sql.strip()), 100)

    def test_expected_tables_and_indexes_exist(self):
        tables = {
            row[0] for row in self.db.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        self.assertTrue({
            "users", "auth_identities", "workspace_tasks", "idempotency_records"
        }.issubset(tables))
        indexes = {
            row[0] for row in self.db.execute(
                "SELECT name FROM sqlite_master WHERE type = 'index'"
            )
        }
        self.assertTrue({
            "auth_identities_user_id_idx",
            "workspace_tasks_owner_page_idx",
            "idempotency_records_expiry_idx",
        }.issubset(indexes))

    def test_identity_is_unique_per_issuer_and_subject(self):
        self.add_user("user-a")
        self.add_user("user-b")
        self.db.execute(
            "INSERT INTO auth_identities VALUES (?, ?, ?, ?, ?)",
            ("identity-a", "user-a", "https://issuer.example", "subject-1", 1_800_000_000_000),
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO auth_identities VALUES (?, ?, ?, ?, ?)",
                ("identity-b", "user-b", "https://issuer.example", "subject-1", 1_800_000_000_001),
            )
        self.db.execute(
            "INSERT INTO auth_identities VALUES (?, ?, ?, ?, ?)",
            ("identity-c", "user-b", "https://another-issuer.example", "subject-1", 1_800_000_000_001),
        )

    def test_orphan_identity_and_task_are_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO auth_identities VALUES (?, ?, ?, ?, ?)",
                ("identity-a", "missing-user", "https://issuer.example", "subject-1", 1_800_000_000_000),
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO workspace_tasks VALUES (?, ?, ?, ?, ?, ?)",
                ("task-a", "missing-user", "task", 0, 1_800_000_000_000, 1_800_000_000_000),
            )

    def test_task_constraints_reject_empty_long_text_and_invalid_boolean(self):
        self.add_user("user-a")
        invalid_rows = [
            ("task-blank", "   ", 0),
            ("task-long", "x" * 121, 0),
            ("task-bool", "valid", 2),
        ]
        for task_id, task_text, done in invalid_rows:
            with self.subTest(task_id=task_id):
                with self.assertRaises(sqlite3.IntegrityError):
                    self.db.execute(
                        "INSERT INTO workspace_tasks VALUES (?, ?, ?, ?, ?, ?)",
                        (task_id, "user-a", task_text, done, 1_800_000_000_000, 1_800_000_000_000),
                    )

    def test_workspace_records_are_owned_by_a_valid_user_and_cascade_on_deletion(self):
        self.add_user("user-a")
        self.db.execute(
            "INSERT INTO auth_identities VALUES (?, ?, ?, ?, ?)",
            ("identity-a", "user-a", "https://issuer.example", "subject-a", 1_800_000_000_000),
        )
        self.db.execute(
            "INSERT INTO workspace_tasks VALUES (?, ?, ?, ?, ?, ?)",
            ("task-a", "user-a", "private task", 0, 1_800_000_000_000, 1_800_000_000_000),
        )
        self.db.execute(
            "INSERT INTO idempotency_records VALUES (?, ?, ?, ?, ?, ?)",
            ("user-a", "a" * 64, "b" * 64, '{"ok":true}', 1_800_000_000_000, 1_800_000_060_000),
        )
        self.db.execute("DELETE FROM users WHERE id = ?", ("user-a",))
        for table in ("auth_identities", "workspace_tasks", "idempotency_records"):
            with self.subTest(table=table):
                self.assertEqual(self.db.execute(f"SELECT count(*) FROM {table}").fetchone()[0], 0)

    def test_idempotency_key_is_scoped_to_user_and_expiry_is_validated(self):
        self.add_user("user-a")
        self.add_user("user-b")
        row = ("a" * 64, "b" * 64, '{"ok":true}', 1_800_000_000_000, 1_800_000_060_000)
        self.db.execute(
            "INSERT INTO idempotency_records VALUES (?, ?, ?, ?, ?, ?)",
            ("user-a", *row),
        )
        self.db.execute(
            "INSERT INTO idempotency_records VALUES (?, ?, ?, ?, ?, ?)",
            ("user-b", *row),
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO idempotency_records VALUES (?, ?, ?, ?, ?, ?)",
                ("user-a", *row),
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO idempotency_records VALUES (?, ?, ?, ?, ?, ?)",
                ("user-a", "c" * 64, "d" * 64, "{}", 100, 100),
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO idempotency_records VALUES (?, ?, ?, ?, ?, ?)",
                ("user-a", "e" * 64, "f" * 64, "not-json", 1_800_000_000_000, 1_800_000_060_000),
            )

    def test_task_owner_pagination_index_is_composite(self):
        columns = [
            row[2] for row in self.db.execute(
                "PRAGMA index_info('workspace_tasks_owner_page_idx')"
            )
        ]
        self.assertEqual(columns, ["user_id", "created_at", "id"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
