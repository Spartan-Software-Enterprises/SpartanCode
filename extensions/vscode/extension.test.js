const assert = require("node:assert");
const test = require("node:test");
const {
  bridgeRequestOptions,
  boundedSelection,
  boundedNote,
  collaborationEventsRoute,
  gitRoute,
  boundedGitOutput,
  gitCommitMessage,
  snapshotPath,
  summarizeSnapshot,
} = require("./extension");

test("VS Code bridge requests are authenticated and bounded", () => {
  const request = bridgeRequestOptions(
    "http://127.0.0.1:8787",
    "/v1/snapshot",
    "secret",
  );
  assert.equal(request.url.pathname, "/v1/snapshot");
  assert.equal(request.options.headers.Authorization, "Bearer secret");
  assert.throws(
    () => bridgeRequestOptions("file:///tmp", "/v1/snapshot"),
    /HTTP/,
  );
});

test("selection and snapshot paths are bounded and workspace-local", () => {
  const document = { getText: () => "x".repeat(25_000) };
  assert.equal(boundedSelection(document, {}).length, 20_000);
  assert.equal(
    snapshotPath("/workspace"),
    "/workspace/.spartancode/vscode-snapshot.json",
  );
});

test("snapshot summaries expose active work and pending approvals", () => {
  assert.deepEqual(
    summarizeSnapshot({
      missions: [
        { status: "planning" },
        { status: "complete" },
        { status: "failed" },
      ],
      approvals: [{ status: "pending" }, { status: "resolved" }],
      artifacts: [{ id: "a1" }],
    }),
    { missions: 3, activeMissions: 1, pendingApprovals: 1, artifacts: 1 },
  );
});

test("collaboration commands bound notes and encode session routes", () => {
  assert.equal(boundedNote("  hello  "), "hello");
  assert.equal(boundedNote("x".repeat(5_000)).length, 4_000);
  assert.equal(
    collaborationEventsRoute("session with spaces"),
    "/v1/collaboration/sessions/session%20with%20spaces/events",
  );
  assert.throws(() => collaborationEventsRoute(""), /invalid/);
});

test("VS Code Git commands use bounded authenticated routes and messages", () => {
  assert.equal(gitRoute("status"), "/v1/git/status");
  assert.equal(gitRoute("diff"), "/v1/git/diff");
  assert.equal(gitRoute("stage"), "/v1/git/stage");
  assert.equal(gitRoute("commit"), "/v1/git/commit");
  assert.throws(() => gitRoute("reset"), /invalid/);
  assert.equal(boundedGitOutput({ output: "clean" }), "clean");
  assert.equal(boundedGitOutput({ output: "x".repeat(60_000) }).length, 50_000);
  assert.equal(gitCommitMessage("  Add feature  "), "Add feature");
  assert.throws(() => gitCommitMessage(""), /required/);
  assert.throws(() => gitCommitMessage("x".repeat(73)), /too long/);
});
