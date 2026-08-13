function getRuntimeStatus(environment = process.env) {
  const configuredCloud = Boolean(
    environment.OPENAI_API_KEY || environment.ANTHROPIC_API_KEY,
  );
  return {
    mode: configuredCloud
      ? "local-first with cloud fallback"
      : "local-first offline",
    runtimes: [
      { id: "llama.cpp", status: "available", role: "primary local runtime" },
      { id: "mlc-chat", status: "planned", role: "accelerated mobile runtime" },
      { id: "webllm", status: "planned", role: "browser fallback" },
    ],
    models: [
      {
        id: "Qwen3-1.7B",
        format: "GGUF",
        quantization: "Q4_K_M",
        license: "Apache-2.0",
      },
      {
        id: "Phi-4-mini",
        format: "GGUF",
        quantization: "Q4_K_M",
        license: "MIT",
      },
    ],
  };
}

module.exports = { getRuntimeStatus };
