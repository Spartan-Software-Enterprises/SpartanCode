const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createMissionStore } = require("./mission-store");
const { createSettingsHierarchy } = require("./settings-hierarchy");

test("settings persist across workspace reloads", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-settings-"),
  );
  const filePath = path.join(directory, "workspace.json");
  const store = createMissionStore(filePath);
  store.updateSettings({ model: "Phi-4-mini", protocol: "MCP Bridge" });
  store.updateSettings({ executionMode: "yolo" });
  const settings = createMissionStore(filePath).snapshot().settings;
  assert.equal(settings.model, "Phi-4-mini");
  assert.equal(settings.protocol, "MCP Bridge");
  assert.equal(settings.executionMode, "yolo");
  fs.rmSync(directory, { recursive: true, force: true });
});

test("settings hierarchy resolves global, project, agent, and session overrides", () => {
  const hierarchy = createSettingsHierarchy({
    baseSettings: { model: "base", executionMode: "guided" },
    allowedKeys: new Set(["model", "executionMode"]),
  });
  hierarchy.set("global", "default", { model: "global", ignored: true });
  hierarchy.set("project", "project-a", { model: "project" });
  hierarchy.set("agent", "leo", { executionMode: "yolo" });
  hierarchy.set("session", "session-1", { model: "session" });
  assert.deepEqual(
    hierarchy.resolve({
      projectId: "project-a",
      agentId: "leo",
      sessionId: "session-1",
    }),
    {
      model: "session",
      executionMode: "yolo",
    },
  );
  assert.throws(
    () => hierarchy.set("unknown", "id", {}),
    /Unknown settings scope/,
  );
});

test("scoped settings persist across workspace reloads", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-scoped-settings-"),
  );
  const filePath = path.join(directory, "workspace.json");
  const store = createMissionStore(filePath);
  store.updateScopedSettings("project", "project-a", { model: "Phi-4-mini" });
  assert.equal(
    createMissionStore(filePath).resolveSettings({ projectId: "project-a" })
      .model,
    "Phi-4-mini",
  );
  fs.rmSync(directory, { recursive: true, force: true });
});
