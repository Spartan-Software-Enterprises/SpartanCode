const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createMissionStore } = require("./mission-store");

test("settings persist across workspace reloads", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-settings-"),
  );
  const filePath = path.join(directory, "workspace.json");
  const store = createMissionStore(filePath);
  store.updateSettings({ model: "Phi-4-mini", protocol: "MCP Bridge" });
  const settings = createMissionStore(filePath).snapshot().settings;
  assert.equal(settings.model, "Phi-4-mini");
  assert.equal(settings.protocol, "MCP Bridge");
  fs.rmSync(directory, { recursive: true, force: true });
});
