const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createModelCache } = require("./model-cache");

test("model cache only prepares explicitly licensed models", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-models-"),
  );
  const cache = createModelCache(path.join(directory, "models.json"));
  assert.equal(cache.prepare("Qwen3-1.7B").status, "ready");
  assert.throws(() => cache.prepare("Llama-3.2-1B"), /commercial license/);
  fs.rmSync(directory, { recursive: true, force: true });
});
