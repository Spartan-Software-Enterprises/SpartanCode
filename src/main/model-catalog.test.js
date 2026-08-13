const assert = require("assert");
const test = require("node:test");
const { listLicensedModels } = require("./model-catalog");

test("commercial model catalog excludes non-permissive model licenses", () => {
  const models = listLicensedModels({ commercialOnly: true });
  assert.deepEqual(
    models.map((model) => model.id),
    ["Qwen3-1.7B", "Phi-4-mini"],
  );
});
