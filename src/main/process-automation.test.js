const assert = require("node:assert/strict");
const test = require("node:test");
const { createProcessAutomation } = require("./process-automation");

test("process automation refuses non-allowlisted executables", () => {
  const result = createProcessAutomation({
    environment: { SPARTANCODE_PROCESS_ALLOWLIST: "node" },
  }).launch({ executable: "sh", args: ["-c", "echo unsafe"] });
  assert.equal(result.status, "review-required");
});

test("process automation launches allowlisted commands without a shell", () => {
  let invocation;
  const result = createProcessAutomation({
    environment: { SPARTANCODE_PROCESS_ALLOWLIST: "node" },
    spawnProcess(executable, args, options) {
      invocation = { executable, args, options };
      return { pid: 42 };
    },
  }).launch({ executable: "node", args: ["--version"] });
  assert.equal(result.status, "started");
  assert.equal(invocation.options.shell, false);
  assert.deepEqual(invocation.args, ["--version"]);
});
