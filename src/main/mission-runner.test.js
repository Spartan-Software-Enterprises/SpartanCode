const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createMissionStore } = require("./mission-store");
const { createMissionRunner } = require("./mission-runner");

test("mission runner creates a plan and advances through verification", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-"));
  const store = createMissionStore(path.join(directory, "workspace.json"));
  const timers = [];
  const window = {
    isDestroyed: () => false,
    webContents: {
      send: (event, snapshot) => timers.push({ event, snapshot }),
    },
  };
  const run = createMissionRunner(store, window, {
    schedule: (callback) => timers.push(callback),
  });
  const mission = store.addMission("Build an offline model picker");

  run(mission);
  assert.equal(store.snapshot().missions[0].plan.goal, mission.description);
  assert.equal(store.snapshot().artifacts[0].type, "plan");
  assert.equal(timers.filter((item) => typeof item === "function").length, 3);

  timers
    .filter((item) => typeof item === "function")
    .forEach((callback) => callback());
  const snapshot = store.snapshot();
  assert.equal(snapshot.missions[0].status, "complete");
  assert.equal(snapshot.artifacts[0].type, "verification");
  assert.equal(snapshot.activity[0].agent, "Verify agent");
  assert.equal(
    timers.filter((item) => item.event === "workspace:changed").length,
    4,
  );

  fs.rmSync(directory, { recursive: true, force: true });
});
