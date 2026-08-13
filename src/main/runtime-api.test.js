const assert = require("assert");
const test = require("node:test");
const { createRuntimeRegistry } = require("./runtime-adapters");

test("runtime API boundary rejects malformed invocation inputs", async () => {
  const registry = createRuntimeRegistry({
    resolver: () => {
      throw new Error("missing");
    },
  });
  assert.throws(() => registry.generate("", {}), /Unknown runtime/);
  assert.deepEqual(
    registry.list().map((item) => item.id),
    ["llama.cpp", "mlc-chat", "pocketpal", "webllm"],
  );
});
