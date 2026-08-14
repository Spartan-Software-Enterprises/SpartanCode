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

const MAX_HUGGINGFACE_QUERY_LENGTH = 200;
const MAX_HUGGINGFACE_RESULTS = 50;
const HUGGINGFACE_TIMEOUT_MS = 10_000;

function listLicensedModels({ commercialOnly = false } = {}) {
  return supportedModels.filter(
    (model) =>
      !commercialOnly ||
      (model.licenseStatus === "verified" &&
        ["MIT", "Apache-2.0"].includes(model.license)),
  );
}

function listAvailableModels({ commercialOnly = false } = {}) {
  return listLicensedModels({ commercialOnly });
}

function normalizeHuggingFaceModel(item) {
  if (!item || typeof item !== "object" || typeof item.id !== "string")
    return null;
  const tags = Array.isArray(item.tags)
    ? item.tags.filter((tag) => typeof tag === "string").slice(0, 50)
    : [];
  const searchableId = item.id.toLowerCase();
  const searchableTags = tags.join(" ").toLowerCase();
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
    tags,
    pipelineTag:
      typeof item.pipeline_tag === "string" ? item.pipeline_tag : null,
    modelType: typeof item.library_name === "string" ? item.library_name : null,
    communityModel: true,
    modelFamily: searchableId.split("/").pop(),
    uncensored:
      searchableId.includes("uncensored") ||
      searchableTags.includes("uncensored"),
    distilled:
      searchableId.includes("distill") || searchableTags.includes("distill"),
  };
}

async function searchHuggingFaceModels(
  query,
  { fetchImpl = fetch, limit = 20, timeoutMs = HUGGINGFACE_TIMEOUT_MS } = {},
) {
  if (typeof query !== "string")
    throw new Error("Hugging Face query must be text");
  if (query.length > MAX_HUGGINGFACE_QUERY_LENGTH)
    throw new Error("Hugging Face query is too long");
  const url = new URL("https://huggingface.co/api/models");
  if (query) url.searchParams.set("search", query);
  url.searchParams.set(
    "limit",
    String(Math.min(Math.max(Number(limit) || 1, 1), MAX_HUGGINGFACE_RESULTS)),
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok)
      throw new Error(`Hugging Face search failed (${response.status})`);
    const models = await response.json();
    if (!Array.isArray(models))
      throw new Error("Hugging Face search returned malformed data");
    return models.map(normalizeHuggingFaceModel).filter(Boolean);
  } catch (error) {
    if (error?.name === "AbortError")
      throw new Error("Hugging Face search timed out");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  listLicensedModels,
  listAvailableModels,
  normalizeHuggingFaceModel,
  searchHuggingFaceModels,
  supportedModels,
  MAX_HUGGINGFACE_QUERY_LENGTH,
  MAX_HUGGINGFACE_RESULTS,
};
