const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createLocalStageExecutor } = require("./stage-executor");

test("local stage executor validates workspace manifests without a workspace", async () => {
  const executor = createLocalStageExecutor({ getWorkspacePath: () => null });
  const result = await executor({ status: "building" });
  assert.equal(result.ok, true);
});

test("local stage executor runs the workspace test script", async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-stage-"),
  );
  fs.writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify({ scripts: { test: "node test.js" } }),
  );
  const calls = [];
  const executor = createLocalStageExecutor({
    getWorkspacePath: () => directory,
    commandRunner: async (...args) => {
      calls.push(args);
      return { ok: true, output: "ok" };
    },
  });
  const result = await executor({ status: "verifying" });
  assert.equal(result.ok, true);
  assert.equal(calls[0][1][0], "test");
  fs.rmSync(directory, { recursive: true, force: true });
});
