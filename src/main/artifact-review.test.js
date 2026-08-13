const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createMissionStore } = require("./mission-store");

test("artifact review is persisted in the audit log", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-review-"),
  );
  const store = createMissionStore(path.join(directory, "workspace.json"));
  const artifact = store.addArtifact({ name: "Execution plan", type: "plan" });
  assert.equal(
    store.reviewArtifact(artifact.id, "accepted", "Looks good").review.decision,
    "accepted",
  );
  assert.equal(store.auditLog()[0].action, "artifact:accepted");
  fs.rmSync(directory, { recursive: true, force: true });
});
