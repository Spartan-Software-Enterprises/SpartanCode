const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createMissionStore } = require("./mission-store");
const { createMissionRunner } = require("./mission-runner");

test("mission runner creates a plan and stops when a stage fails", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-"));
  const store = createMissionStore(path.join(directory, "workspace.json"));
  const stages = [];
  const updates = [];
  const window = {
    isDestroyed: () => false,
    webContents: {
      send: (event, snapshot) => updates.push({ event, snapshot }),
    },
  };
  const run = createMissionRunner(store, window, {
    schedule: (callback) => stages.push(callback),
    executeStage: (stage) => ({ ok: stage.status !== "verifying" }),
  });
  const mission = store.addMission("Build an offline model picker");

  run(mission);
  assert.equal(store.snapshot().missions[0].plan.goal, mission.description);
  assert.equal(store.snapshot().artifacts[0].type, "plan");
  assert.equal(stages.length, 1);

  await stages[0]();
  await new Promise((resolve) => setImmediate(resolve));
  const snapshot = store.snapshot();
  assert.equal(snapshot.missions[0].status, "failed");
  assert.equal(snapshot.artifacts[0].type, "plan");
  assert.equal(
    JSON.parse(snapshot.artifacts[0].content).stages[2].status,
    "running",
  );
  assert.equal(snapshot.activity[0].agent, "Verify agent");
  assert.equal(
    updates.filter((item) => item.event === "workspace:changed").length,
    3,
  );

  fs.rmSync(directory, { recursive: true, force: true });
});
