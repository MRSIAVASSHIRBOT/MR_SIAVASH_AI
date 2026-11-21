import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../app-storage.js", import.meta.url), "utf8");

function loadStorage() {
  const window = {};
  vm.runInNewContext(source, { window, JSON, Set, Error, Array, Object, Math, RegExp });
  return window.MRAppStorage;
}

test("storage module exposes a frozen, isolated public API", () => {
  const storage = loadStorage();
  assert.ok(Object.isFrozen(storage));
  assert.deepEqual(Object.keys(storage).sort(), [
    "normalizeLoadedTasks",
    "parseStoredFavorites",
    "parseStoredTasks",
    "validateWorkspaceBackup"
  ]);
});

test("stored task snapshots are normalized and reject duplicate or malformed records", () => {
  const storage = loadStorage();
  const valid = storage.parseStoredTasks(JSON.stringify({
    version: 2,
    tasks: [{ id: "task-1", text: "  Learn   Python ", done: false }]
  }));
  assert.equal(valid.length, 1);
  assert.deepEqual({ ...valid[0] }, { id: "task-1", text: "Learn Python", done: false });

  assert.throws(() => storage.parseStoredTasks(JSON.stringify({
    version: 2,
    tasks: [
      { id: "same", text: "First", done: false },
      { id: "same", text: "Second", done: true }
    ]
  })), /معتبر نیست/);
  assert.throws(() => storage.parseStoredTasks(JSON.stringify({
    version: 2,
    tasks: [{ id: "task-1", text: "x".repeat(121), done: false }]
  })), /خارج از محدوده/);
  assert.throws(() => storage.parseStoredTasks(JSON.stringify({ version: 2, tasks: new Array(101).fill({ id: "x", text: "x", done: false }) })), /معتبر نیست/);
});

test("favorite snapshots delegate normalization and reject unsafe identifiers", () => {
  const storage = loadStorage();
  const modules = [{ id: "agents" }];
  const normalize = (ids, available, deferUnknown) => ({ ids, available, deferUnknown });
  const result = storage.parseStoredFavorites(JSON.stringify(["agents"]), normalize, modules);
  assert.equal(result.ids[0], "agents");
  assert.equal(result.available, modules);
  assert.equal(result.deferUnknown, false);
  assert.throws(() => storage.parseStoredFavorites(JSON.stringify(["../unsafe"]), normalize, modules), /معتبر نیست/);
  assert.throws(() => storage.parseStoredFavorites(JSON.stringify(new Array(51).fill("agents")), normalize, modules), /معتبر نیست/);
});

test("legacy task loading repairs missing and duplicate identifiers without truncating valid text", () => {
  const storage = loadStorage();
  let nextId = 0;
  const result = storage.normalizeLoadedTasks([
    { id: "duplicate", text: "First task", done: false },
    { id: "duplicate", text: "Second task", done: true },
    { text: "  Third   task ", done: false },
    { id: "bad id", text: "Fourth task", done: false },
    { id: "discard", text: " ", done: false }
  ], () => "repaired-" + (++nextId));
  assert.equal(result.tasks.length, 4);
  assert.equal(result.repairedIds, 3);
  assert.equal(result.discardedTasks, 1);
  assert.equal(result.tasks[1].id, "repaired-1");
  assert.equal(result.tasks[2].text, "Third task");
  assert.equal(result.tasks[3].id, "repaired-3");
});

test("workspace backup validator enforces root, task and favorite contracts", () => {
  const storage = loadStorage();
  const valid = {
    schema: "mr-siavash-ai-workspace",
    version: 1,
    tasks: [{ id: "task-1", text: "Review architecture", done: false }],
    favorites: ["agents"]
  };
  assert.equal(storage.validateWorkspaceBackup(valid), valid);
  assert.throws(() => storage.validateWorkspaceBackup({ ...valid, extra: true }), /معتبر نیست/);
  assert.throws(() => storage.validateWorkspaceBackup({ ...valid, tasks: [{ id: "task-1", text: "OK", done: false, extra: 1 }] }), /معتبر نیست/);
  assert.throws(() => storage.validateWorkspaceBackup({ ...valid, favorites: ["agents", "agents"] }), /معتبر نیست/);
  assert.throws(() => storage.validateWorkspaceBackup({ ...valid, tasks: new Array(101).fill({ text: "task", done: false }) }), /بیش از ۱۰۰ کار/);
});
