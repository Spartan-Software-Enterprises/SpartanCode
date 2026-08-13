const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createMissionStore } = require("./mission-store");

test("mission store persists missions, activities, and artifacts", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-"));
  const filePath = path.join(directory, "workspace.json");
  const store = createMissionStore(filePath);
  const mission = store.addMission("Build an offline model picker");

  store.updateMission(mission.id, { status: "complete" });
  store.addActivity({
    agent: "Verify agent",
    message: "Verification complete",
  });
  store.addArtifact({ name: "Verification report", type: "verification" });

  const reloaded = createMissionStore(filePath).snapshot();
  assert.equal(reloaded.missions[0].status, "complete");
  assert.equal(reloaded.artifacts[0].name, "Verification report");
  assert.equal(reloaded.activity[0].agent, "Verify agent");

  const cleared = createMissionStore(filePath);
  cleared.clearMissions();
  const empty = createMissionStore(filePath).snapshot();
  assert.equal(empty.missions.length, 0);
  assert.equal(empty.artifacts.length, 0);
  assert.equal(empty.activity.length, 0);

  fs.rmSync(directory, { recursive: true, force: true });
});
