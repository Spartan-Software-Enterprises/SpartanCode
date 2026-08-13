const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createMissionStore } = require("./mission-store");

test("remote connection profiles are persisted without credentials", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-connection-"),
  );
  const store = createMissionStore(path.join(directory, "workspace.json"));
  store.addConnection({
    name: "Home Server",
    host: "home.local",
    transport: "mosh",
  });
  const profile = createMissionStore(
    path.join(directory, "workspace.json"),
  ).snapshot().connections[0];
  assert.equal(profile.host, "home.local");
  assert.equal(profile.transport, "mosh");
  assert.equal(profile.password, undefined);
  fs.rmSync(directory, { recursive: true, force: true });
});
