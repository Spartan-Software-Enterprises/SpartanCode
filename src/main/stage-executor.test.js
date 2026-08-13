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

test("local stage executor keeps non-Node workspaces eligible", async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-stage-"),
  );
  const executor = createLocalStageExecutor({
    getWorkspacePath: () => directory,
  });
  const result = await executor({ status: "building" });
  assert.equal(result.ok, true);
  assert.match(result.message, /No package manifest/);
  fs.rmSync(directory, { recursive: true, force: true });
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
  assert.equal(calls[0][1].length, 1);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("local stage executor reports malformed workspace manifests", async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-stage-"),
  );
  fs.writeFileSync(path.join(directory, "package.json"), "{broken");
  const executor = createLocalStageExecutor({
    getWorkspacePath: () => directory,
  });
  const result = await executor({ status: "verifying" });
  assert.equal(result.ok, false);
  assert.match(result.message, /Invalid package\.json/);
  fs.rmSync(directory, { recursive: true, force: true });
});
