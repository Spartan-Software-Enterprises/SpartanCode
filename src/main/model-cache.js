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
    prepare(modelId, quantization = "Q4_K_M") {
      const model = listLicensedModels({ commercialOnly: true }).find(
        (item) => item.id === modelId,
      );
      if (!model)
        throw new Error(
          "Model is not available under the commercial license policy",
        );
      if (!model.quantizations.includes(quantization))
        throw new Error("Unsupported quantization for model");
      const cached = {
        id: model.id,
        quantization,
        format: "GGUF",
        status: "ready",
        preparedAt: new Date().toISOString(),
      };
      state.models = [
        cached,
        ...state.models.filter((item) => item.id !== model.id),
      ];
      persist();
      return cached;
    },
  };
}

module.exports = { createModelCache };
