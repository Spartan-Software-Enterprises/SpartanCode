const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createModelCache } = require("./model-cache");

test("model cache prepares built-in and explicitly selected community models", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-models-"),
  );
  const cache = createModelCache(path.join(directory, "models.json"));
  assert.equal(cache.prepare("Qwen3-1.7B").status, "ready");
  assert.equal(cache.prepare("Llama-3.2-1B").status, "ready");
  fs.rmSync(directory, { recursive: true, force: true });
});

test("model cache accepts an explicitly selected Hugging Face model", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-hf-models-"),
  );
  const cache = createModelCache(path.join(directory, "models.json"));
  const model = {
    id: "org/custom-model",
    source: "huggingface",
    license: "OpenRAIL",
    licenseStatus: "declared",
  };
  assert.equal(
    cache.prepare(model.id, "repository-defined", model).source,
    "huggingface",
  );
  const unknown = cache.prepare("org/unknown", "repository-defined", {
    ...model,
    id: "org/unknown",
    licenseStatus: "unknown",
  });
  assert.equal(unknown.licenseStatus, "unknown");
  fs.rmSync(directory, { recursive: true, force: true });
});
