const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createMissionStore } = require("./mission-store");

test("settings updates ignore unknown keys", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-safe-settings-"),
  );
  const store = createMissionStore(path.join(directory, "workspace.json"));
  const settings = store.updateSettings({
    model: "Phi-4-mini",
    apiKey: "must-not-persist",
  });
  assert.equal(settings.model, "Phi-4-mini");
  assert.equal(settings.apiKey, undefined);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("settings preserve bounded persona and wake-word preferences", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-persona-settings-"),
  );
  const store = createMissionStore(path.join(directory, "workspace.json"));
  const settings = store.updateSettings({
    personaName: "  Commander Leo  ",
    wakeWord: "  Hey Spartan  ",
  });
  assert.equal(settings.personaName, "Commander Leo");
  assert.equal(settings.wakeWord, "Hey Spartan");
  fs.rmSync(directory, { recursive: true, force: true });
});
