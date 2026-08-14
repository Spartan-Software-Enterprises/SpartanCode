const fs = require("fs");
const path = require("path");
const { listAvailableModels } = require("./model-catalog");
const { downloadVerifiedModel } = require("./model-download");

function createModelCache(filePath) {
  let state = { models: [] };
  try {
    state = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const persist = () => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  };
  const resolveSelected = (modelId, quantization, selectedModel) => {
    const model = listAvailableModels({ commercialOnly: false }).find(
      (item) => item.id === modelId,
    );
    const external =
      selectedModel && selectedModel.source === "huggingface"
        ? selectedModel
        : null;
    if (!model && !external)
      throw new Error(
        "Model is unavailable under the commercial license policy; provide a Hugging Face selection",
      );
    if (external && external.id !== modelId)
      throw new Error(
        "Hugging Face selection does not match the requested model",
      );
    if (model && !model.quantizations.includes(quantization))
      throw new Error("Unsupported quantization for model");
    return model || external;
  };
  const record = (selected, modelId, quantization, extra = {}) => ({
    id: selected.id,
    quantization,
    format: "GGUF",
    status: "ready",
    source: selected.source,
    license: selected.license,
    licenseStatus: selected.licenseStatus || "unknown",
    communityModel: selected.source === "huggingface",
    uncensored: selected.uncensored === true,
    distilled: selected.distilled === true,
    ...extra,
    preparedAt: new Date().toISOString(),
  });
  const save = (cached) => {
    state.models = [
      cached,
      ...state.models.filter((item) => item.id !== cached.id),
    ];
    persist();
    return cached;
  };
  return {
    list() {
      return state.models.map((model) => ({ ...model }));
    },
    prepare(modelId, quantization = "Q4_K_M", selectedModel = null) {
      const selected = resolveSelected(modelId, quantization, selectedModel);
      return save(record(selected, modelId, quantization));
    },
    async download(
      modelId,
      url,
      expectedSha256,
      quantization = "Q4_K_M",
      selectedModel = null,
      { transport } = {},
    ) {
      const selected = resolveSelected(modelId, quantization, selectedModel);
      if (typeof url !== "string" || typeof expectedSha256 !== "string")
        throw new Error("Verified model download requires URL and SHA-256");
      const artifactDirectory = `${filePath}.artifacts`;
      const identity = Buffer.from(`${modelId}-${quantization}`).toString(
        "hex",
      );
      const artifactPath = path.join(artifactDirectory, `${identity}.gguf`);
      const result = await downloadVerifiedModel({
        url,
        expectedSha256,
        partialPath: `${artifactPath}.part`,
        finalPath: artifactPath,
        transport,
      });
      return save(
        record(selected, modelId, quantization, {
          artifactPath: result.artifactPath,
          bytes: result.bytes,
          sha256: result.sha256,
        }),
      );
    },
  };
}

module.exports = { createModelCache };
