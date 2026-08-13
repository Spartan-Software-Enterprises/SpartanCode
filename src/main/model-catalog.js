const supportedModels = [
  {
    id: "Qwen3-1.7B",
    provider: "Qwen",
    license: "Apache-2.0",
    formats: ["GGUF"],
    quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
    local: true,
    source: "builtin",
    licenseStatus: "verified",
  },
  {
    id: "Phi-4-mini",
    provider: "Microsoft",
    license: "MIT",
    formats: ["GGUF"],
    quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
    local: true,
    source: "builtin",
    licenseStatus: "verified",
  },
  {
    id: "Llama-3.2-1B",
    provider: "Meta",
    license: "Meta Community",
    formats: ["GGUF"],
    quantizations: ["Q4_K_M", "Q4_0"],
    local: true,
    source: "builtin",
    licenseStatus: "restricted",
  },
];

function listLicensedModels({ commercialOnly = false } = {}) {
  return supportedModels.filter(
    (model) =>
      !commercialOnly ||
      (model.licenseStatus === "verified" &&
        ["MIT", "Apache-2.0"].includes(model.license)),
  );
}

function normalizeHuggingFaceModel(item) {
  if (!item || typeof item !== "object" || typeof item.id !== "string")
    return null;
  return {
    id: item.id,
    provider: typeof item.author === "string" ? item.author : "Hugging Face",
    license: typeof item.license === "string" ? item.license : "Unknown",
    licenseStatus: item.license ? "declared" : "unknown",
    formats: ["GGUF", "safetensors"],
    quantizations: ["repository-defined"],
    source: "huggingface",
    downloadable: true,
    downloads: typeof item.downloads === "number" ? item.downloads : 0,
  };
}

async function searchHuggingFaceModels(
  query,
  { fetchImpl = fetch, limit = 20 } = {},
) {
  const url = new URL("https://huggingface.co/api/models");
  if (query) url.searchParams.set("search", query);
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 100)));
  const response = await fetchImpl(url);
  if (!response.ok)
    throw new Error(`Hugging Face search failed (${response.status})`);
  const models = await response.json();
  return Array.isArray(models)
    ? models.map(normalizeHuggingFaceModel).filter(Boolean)
    : [];
}

module.exports = {
  listLicensedModels,
  normalizeHuggingFaceModel,
  searchHuggingFaceModels,
  supportedModels,
};
