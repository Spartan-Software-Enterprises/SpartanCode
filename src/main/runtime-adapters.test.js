const assert = require("assert");
const test = require("node:test");
const {
  createRuntimeRegistry,
  listRuntimeAdapters,
} = require("./runtime-adapters");

test("runtime discovery reports unavailable optional runtimes honestly", () => {
  const adapters = listRuntimeAdapters({
    resolver: () => {
      throw new Error("missing");
    },
  });
  assert.equal(adapters.length, 4);
  assert.ok(adapters.every((adapter) => adapter.status === "unavailable"));
});

test("runtime registry invokes an installed adapter through the shared contract", async () => {
  const registry = createRuntimeRegistry({
    resolver: () => "/virtual/runtime.js",
    loader: () => ({ generate: async ({ prompt }) => `answer:${prompt}` }),
  });
  const result = await registry.generate("llama.cpp", { prompt: "hello" });
  assert.deepEqual(result, {
    ok: true,
    runtime: "llama.cpp",
    output: "answer:hello",
  });
});

test("runtime registry returns a typed unavailable result", () => {
  const registry = createRuntimeRegistry({
    resolver: () => {
      throw new Error("missing");
    },
  });
  assert.deepEqual(registry.generate("webllm", { prompt: "hello" }), {
    ok: false,
    runtime: "webllm",
    code: "runtime-unavailable",
    message: "webllm is not installed in this environment",
  });
});
