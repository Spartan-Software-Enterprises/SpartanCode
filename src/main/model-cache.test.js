const assert = require("assert");
const crypto = require("crypto");
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

test("model cache records only verified downloaded artifacts", async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-model-download-cache-"),
  );
  const cache = createModelCache(path.join(directory, "models.json"));
  const bytes = Buffer.from("verified-model");
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const cached = await cache.download(
    "org/custom-model",
    "https://example.test/model.gguf",
    sha256,
    "repository-defined",
    {
      id: "org/custom-model",
      source: "huggingface",
      license: "Apache-2.0",
    },
    {
      transport: async () => ({ status: 200, arrayBuffer: async () => bytes }),
    },
  );
  assert.equal(cached.status, "ready");
  assert.equal(cached.sha256, sha256);
  assert.equal(
    fs.readFileSync(cached.artifactPath).toString(),
    "verified-model",
  );
  fs.rmSync(directory, { recursive: true, force: true });
});
