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
    executableResolver: () => null,
  });
  assert.equal(adapters.length, 4);
  assert.ok(adapters.every((adapter) => adapter.status === "unavailable"));
  assert.ok(adapters.every((adapter) => adapter.provenance === null));
});

test("runtime discovery reports executable provenance", () => {
  const adapters = listRuntimeAdapters({
    resolver: () => {
      throw new Error("module missing");
    },
    executableResolver: () => "/opt/llama-cli",
  });
  assert.equal(adapters[0].provenance, "system-path");
  const configured = listRuntimeAdapters({
    resolver: () => {
      throw new Error("module missing");
    },
    executableResolver: () => "/opt/llama-cli",
    environment: { SPARTANCODE_LLAMA_CLI: "/opt/llama-cli" },
  });
  assert.equal(configured[0].provenance, "configured-path");
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
    executableResolver: () => null,
  });
  assert.deepEqual(registry.generate("webllm", { prompt: "hello" }), {
    ok: false,
    runtime: "webllm",
    code: "runtime-unavailable",
    message: "webllm is not installed in this environment",
  });
});

test("runtime registry invokes a configured llama.cpp CLI without shell interpolation", async () => {
  const calls = [];
  const registry = createRuntimeRegistry({
    resolver: () => {
      throw new Error("module missing");
    },
    executableResolver: () => "/opt/llama-cli",
    fileExists: () => true,
    commandRunner: async (file, args) => {
      calls.push({ file, args });
      return "generated locally";
    },
  });
  const result = await registry.generate("llama.cpp", {
    modelPath: "/models/qwen.gguf",
    prompt: "hello; do not execute this",
    maxTokens: 32,
  });
  assert.deepEqual(result, {
    ok: true,
    runtime: "llama.cpp",
    output: "generated locally",
  });
  assert.deepEqual(calls[0], {
    file: "/opt/llama-cli",
    args: [
      "-m",
      "/models/qwen.gguf",
      "-p",
      "hello; do not execute this",
      "-n",
      "32",
      "--temp",
      "0.2",
    ],
  });
});
