const supportedModels = [
  {
    id: "Qwen3-1.7B",
    provider: "Qwen",
    license: "Apache-2.0",
    formats: ["GGUF"],
    quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
    local: true,
  },
  {
    id: "Phi-4-mini",
    provider: "Microsoft",
    license: "MIT",
    formats: ["GGUF"],
    quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
    local: true,
  },
  {
    id: "Llama-3.2-1B",
    provider: "Meta",
    license: "Meta Community",
    formats: ["GGUF"],
    quantizations: ["Q4_K_M", "Q4_0"],
    local: true,
  },
];

function listLicensedModels({ commercialOnly = false } = {}) {
  return supportedModels.filter(
    (model) => !commercialOnly || ["MIT", "Apache-2.0"].includes(model.license),
  );
}

module.exports = { listLicensedModels, supportedModels };
