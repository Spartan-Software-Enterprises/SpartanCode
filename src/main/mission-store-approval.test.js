const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createMissionStore } = require("./mission-store");

test("approval requests can be resolved", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-approval-"),
  );
  const store = createMissionStore(path.join(directory, "workspace.json"));
  const mission = store.addMission("Deploy the application");
  const approval = store.requestApproval({
    missionId: mission.id,
    title: "Deploy?",
    detail: "Review deployment",
  });
  assert.equal(store.snapshot().approvals[0].status, "pending");
  assert.equal(
    store.resolveApproval(approval.id, "approved").status,
    "approved",
  );
  fs.rmSync(directory, { recursive: true, force: true });
});
