const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createMissionStore } = require("./mission-store");

test("execution mode only accepts guided or yolo", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-mode-"));
  const store = createMissionStore(path.join(directory, "workspace.json"));
  assert.equal(
    store.updateSettings({ executionMode: "unknown" }).executionMode,
    "guided",
  );
  assert.equal(
    store.updateSettings({ executionMode: "yolo" }).executionMode,
    "yolo",
  );
  fs.rmSync(directory, { recursive: true, force: true });
});
