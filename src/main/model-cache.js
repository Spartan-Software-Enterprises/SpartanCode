const fs = require("fs");
const path = require("path");
const { listLicensedModels } = require("./model-catalog");

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
  return {
    list() {
      return state.models.map((model) => ({ ...model }));
    },
    prepare(modelId, quantization = "Q4_K_M", selectedModel = null) {
      const model = listLicensedModels({ commercialOnly: true }).find(
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
      if (external && external.licenseStatus === "unknown")
        throw new Error(
          "Acknowledge the Hugging Face model license before preparing it",
        );
      if (model && !model.quantizations.includes(quantization))
        throw new Error("Unsupported quantization for model");
      const selected = model || external;
      const cached = {
        id: selected.id,
        quantization,
        format: "GGUF",
        status: "ready",
        source: selected.source,
        license: selected.license,
        preparedAt: new Date().toISOString(),
      };
      state.models = [
        cached,
        ...state.models.filter((item) => item.id !== selected.id),
      ];
      persist();
      return cached;
    },
  };
}

module.exports = { createModelCache };
