const runtimeDescriptors = [
  {
    id: "llama.cpp",
    modules: ["node-llama-cpp"],
    role: "primary local runtime",
    platforms: ["desktop", "android-native"],
  },
  {
    id: "mlc-chat",
    modules: ["@mlc-ai/mlc-llm", "mlc-chat"],
    role: "accelerated mobile runtime",
    platforms: ["android-native"],
  },
  {
    id: "pocketpal",
    modules: ["pocketpal-runtime"],
    role: "mobile fallback runtime",
    platforms: ["android-native"],
  },
  {
    id: "webllm",
    modules: ["@mlc-ai/web-llm"],
    role: "browser fallback runtime",
    platforms: ["web"],
  },
];

function moduleAvailable(moduleName, resolver = require.resolve) {
  try {
    resolver(moduleName);
    return true;
  } catch {
    return false;
  }
}

function listRuntimeAdapters({ resolver = require.resolve } = {}) {
  return runtimeDescriptors.map((descriptor) => {
    const moduleName = descriptor.modules.find((name) =>
      moduleAvailable(name, resolver),
    );
    return {
      ...descriptor,
      module: moduleName || null,
      status: moduleName ? "available" : "unavailable",
    };
  });
}

function createRuntimeRegistry({
  resolver = require.resolve,
  loader = require,
} = {}) {
  const adapters = listRuntimeAdapters({ resolver });
  return {
    list() {
      return adapters.map((adapter) => ({ ...adapter }));
    },
    generate(id, request = {}) {
      const descriptor = adapters.find((adapter) => adapter.id === id);
      if (!descriptor) throw new Error(`Unknown runtime: ${id}`);
      if (!descriptor.module) {
        return {
          ok: false,
          runtime: id,
          code: "runtime-unavailable",
          message: `${id} is not installed in this environment`,
        };
      }
      const runtime = loader(descriptor.module);
      if (!runtime || typeof runtime.generate !== "function") {
        return {
          ok: false,
          runtime: id,
          code: "adapter-contract-missing",
          message: `${id} does not expose the SpartanCode generate contract`,
        };
      }
      return Promise.resolve(runtime.generate(request)).then((output) => ({
        ok: true,
        runtime: id,
        output,
      }));
    },
  };
}

module.exports = {
  createRuntimeRegistry,
  listRuntimeAdapters,
  runtimeDescriptors,
};
