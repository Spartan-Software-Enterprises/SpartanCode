const assert = require("assert");
const test = require("node:test");
const {
  listLicensedModels,
  normalizeHuggingFaceModel,
  searchHuggingFaceModels,
} = require("./model-catalog");

test("commercial model catalog excludes non-permissive model licenses", () => {
  const models = listLicensedModels({ commercialOnly: true });
  assert.deepEqual(
    models.map((model) => model.id),
    ["Qwen3-1.7B", "Phi-4-mini"],
  );
});

test("Hugging Face catalog preserves user-selected models and license metadata", () => {
  assert.deepEqual(normalizeHuggingFaceModel({ id: "org/custom-model" }), {
    id: "org/custom-model",
    provider: "Hugging Face",
    license: "Unknown",
    licenseStatus: "unknown",
    formats: ["GGUF", "safetensors"],
    quantizations: ["repository-defined"],
    source: "huggingface",
    downloadable: true,
    downloads: 0,
  });
});

test("Hugging Face search is bounded and normalizes results", async () => {
  let request;
  const results = await searchHuggingFaceModels("qwen", {
    limit: 500,
    fetchImpl: async (url) => {
      request = url;
      return {
        ok: true,
        json: async () => [{ id: "Qwen/model", license: "apache-2.0" }],
      };
    },
  });
  assert.equal(request.searchParams.get("limit"), "100");
  assert.equal(results[0].source, "huggingface");
});
