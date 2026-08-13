const assert = require("assert");
const test = require("node:test");
const { createArtifactStore } = require("./artifact-store");
const { initSettingsDatabase } = require("./settings");

test("artifact store initializes with a SQLite-compatible runtime", () => {
  const db = createArtifactStore();
  assert.ok(db);
  const tables = db.prepare
    ? db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    : db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  assert.ok(tables.length >= 14);
  if (db.close) db.close();
});

test("settings database initializes without a native addon", () => {
  const db = initSettingsDatabase();
  assert.ok(db);
  if (db.close) db.close();
});
