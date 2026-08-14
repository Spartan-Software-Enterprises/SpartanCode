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
      return { pid: 42, once() {} };
    },
  }).launch({ executable: "node", args: ["--version"] });
  assert.equal(result.status, "started");
  assert.equal(invocation.options.shell, false);
  assert.deepEqual(invocation.args, ["--version"]);
});

test("process automation attaches a spawn error handler", () => {
  let event;
  createProcessAutomation({
    environment: { SPARTANCODE_PROCESS_ALLOWLIST: "node" },
    spawnProcess() {
      return {
        pid: 42,
        once(name, handler) {
          event = { name, handler };
        },
      };
    },
  }).launch({ executable: "node" });
  assert.equal(event.name, "error");
  assert.doesNotThrow(() => event.handler(new Error("spawn failed")));
});
