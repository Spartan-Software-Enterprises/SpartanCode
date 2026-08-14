const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const {
  MAX_MISSION_DESCRIPTION,
  MAX_MISSIONS,
  createMissionStore,
} = require("./mission-store");

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
  const secondArtifact = store.addArtifact({
    name: "Second report",
    type: "verification",
  });

  const reloaded = createMissionStore(filePath).snapshot();
  assert.equal(reloaded.missions[0].status, "complete");
  assert.equal(reloaded.artifacts[1].name, "Verification report");
  assert.notEqual(reloaded.artifacts[1].id, secondArtifact.id);
  assert.equal(reloaded.activity[0].agent, "Verify agent");

  const cleared = createMissionStore(filePath);
  cleared.clearMissions();
  const empty = createMissionStore(filePath).snapshot();
  assert.equal(empty.missions.length, 0);
  assert.equal(empty.artifacts.length, 0);
  assert.equal(empty.activity.length, 0);

  fs.rmSync(directory, { recursive: true, force: true });
});

test("mission store recovers from malformed primary state using its last good backup", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-"));
  const filePath = path.join(directory, "workspace.json");
  const store = createMissionStore(filePath);
  const mission = store.addMission("Keep the workspace recoverable");
  store.updateMission(mission.id, { status: "complete" });
  store.addActivity({ agent: "Verify agent", message: "Backup created" });

  fs.copyFileSync(filePath, `${filePath}.bak`);
  fs.writeFileSync(filePath, '{"missions":');

  const recovered = createMissionStore(filePath).snapshot();
  assert.equal(
    recovered.missions[0].description,
    "Keep the workspace recoverable",
  );
  assert.equal(recovered.missions[0].status, "complete");
  assert.equal(recovered.activity[0].message, "Backup created");
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(filePath, "utf8")));

  fs.rmSync(directory, { recursive: true, force: true });
});

test("mission store writes a valid replacement and keeps the previous state as backup", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-"));
  const filePath = path.join(directory, "workspace.json");
  const store = createMissionStore(filePath);
  store.addMission("First durable state");
  store.addMission("Second durable state");

  const current = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const backup = JSON.parse(fs.readFileSync(`${filePath}.bak`, "utf8"));
  assert.equal(current.missions.length, 2);
  assert.equal(backup.missions.length, 1);
  assert.equal(backup.missions[0].description, "First durable state");
  assert.equal(
    fs.readdirSync(directory).some((name) => name.endsWith(".tmp")),
    false,
  );

  fs.rmSync(directory, { recursive: true, force: true });
});

test("mission store bounds descriptions, retained missions, and activity", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-"));
  const filePath = path.join(directory, "workspace.json");
  const store = createMissionStore(filePath);
  assert.throws(
    () => store.addMission("x".repeat(MAX_MISSION_DESCRIPTION + 1)),
    /too long/,
  );
  for (let index = 0; index < MAX_MISSIONS + 5; index += 1)
    store.addMission(`Mission ${index}`);
  const snapshot = store.snapshot();
  assert.equal(snapshot.missions.length, MAX_MISSIONS);
  assert.equal(snapshot.activity.length, 30);
  assert.equal(snapshot.missions[0].description, `Mission ${MAX_MISSIONS + 4}`);
  fs.rmSync(directory, { recursive: true, force: true });
});
