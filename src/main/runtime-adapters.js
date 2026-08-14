const fs = require("fs");
const { execFile, execFileSync } = require("child_process");

const runtimeDescriptors = [
  {
    id: "llama.cpp",
    modules: ["node-llama-cpp"],
    executables: ["llama-cli"],
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

function resolveExecutable(name, environment = process.env) {
  if (name === "llama-cli" && environment.SPARTANCODE_LLAMA_CLI) {
    const configured = environment.SPARTANCODE_LLAMA_CLI;
    return pathIsExecutable(configured) ? configured : null;
  }
  try {
    const resolved = execFileSync("which", [name], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return pathIsExecutable(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

function pathIsExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function listRuntimeAdapters({
  resolver = require.resolve,
  executableResolver = resolveExecutable,
  environment = process.env,
} = {}) {
  return runtimeDescriptors.map((descriptor) => {
    const moduleName = descriptor.modules.find((name) =>
      moduleAvailable(name, resolver),
    );
    const executableName = descriptor.executables?.find((name) =>
      executableResolver(name, environment),
    );
    const executable = executableName
      ? executableResolver(executableName, environment)
      : null;
    return {
      ...descriptor,
      module: moduleName || null,
      executable,
      provenance: moduleName
        ? "node-module"
        : executableName
          ? environment.SPARTANCODE_LLAMA_CLI
            ? "configured-path"
            : "system-path"
          : null,
      status: moduleName || executableName ? "available" : "unavailable",
    };
  });
}

function runExecutable(file, args) {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error)
          return reject(new Error(String(stderr || error.message).trim()));
        resolve(String(stdout || "").trim());
      },
    );
  });
}

function llamaCliRequest(request, fileExists = fs.existsSync) {
  const prompt =
    typeof request.prompt === "string" ? request.prompt.trim() : "";
  const modelPath =
    typeof request.modelPath === "string" ? request.modelPath : "";
  const maxTokens = request.maxTokens === undefined ? 256 : request.maxTokens;
  const temperature =
    request.temperature === undefined ? 0.2 : request.temperature;
  if (!prompt || prompt.length > 100_000)
    return {
      error: "Prompt is required and must be at most 100,000 characters",
    };
  if (!modelPath.startsWith("/") || !fileExists(modelPath))
    return { error: "An absolute existing GGUF modelPath is required" };
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 4096)
    return { error: "maxTokens must be an integer from 1 to 4096" };
  if (typeof temperature !== "number" || temperature < 0 || temperature > 2)
    return { error: "temperature must be between 0 and 2" };
  return {
    args: [
      "-m",
      modelPath,
      "-p",
      prompt,
      "-n",
      String(maxTokens),
      "--temp",
      String(temperature),
    ],
  };
}

function createRuntimeRegistry({
  resolver = require.resolve,
  loader = require,
  executableResolver = resolveExecutable,
  commandRunner = runExecutable,
  fileExists = fs.existsSync,
  environment = process.env,
} = {}) {
  const adapters = listRuntimeAdapters({
    resolver,
    executableResolver,
    environment,
  });
  return {
    list() {
      return adapters.map((adapter) => ({ ...adapter }));
    },
    generate(id, request = {}) {
      const descriptor = adapters.find((adapter) => adapter.id === id);
      if (!descriptor) throw new Error(`Unknown runtime: ${id}`);
      if (!descriptor.module && !descriptor.executable) {
        return {
          ok: false,
          runtime: id,
          code: "runtime-unavailable",
          message: `${id} is not installed in this environment`,
        };
      }
      if (descriptor.executable) {
        const requestConfig = llamaCliRequest(request, fileExists);
        if (requestConfig.error)
          return {
            ok: false,
            runtime: id,
            code: "invalid-request",
            message: requestConfig.error,
          };
        return Promise.resolve(
          commandRunner(descriptor.executable, requestConfig.args),
        ).then(
          (output) => ({ ok: true, runtime: id, output }),
          (error) => ({
            ok: false,
            runtime: id,
            code: "runtime-failed",
            message: error instanceof Error ? error.message : "Runtime failed",
          }),
        );
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
  llamaCliRequest,
  resolveExecutable,
};
