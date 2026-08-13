const assert = require("assert");
const test = require("node:test");
const { getRuntimeStatus } = require("./runtime-status");

test("runtime status remains local-first without cloud credentials", () => {
  const status = getRuntimeStatus({});
  assert.equal(status.mode, "local-first offline");
  assert.equal(status.models[0].format, "GGUF");
  assert.equal(status.runtimes[0].id, "llama.cpp");
  assert.ok(["available", "planned"].includes(status.runtimes[0].status));
});
