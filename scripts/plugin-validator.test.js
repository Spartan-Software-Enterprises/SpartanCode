const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { validatePluginFile } = require("./plugin-validator");

test("plugin validator normalizes a safe declarative manifest", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-plugin-"),
  );
  const manifestPath = path.join(directory, "plugin.json");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      id: "review-persona",
      name: "  Review persona ",
      version: "1.0.0",
      description: "  A bounded review persona. ",
      license: "MIT",
      capabilities: ["template"],
      ignored: "not included",
    }),
  );
  assert.deepEqual(validatePluginFile(manifestPath), {
    id: "review-persona",
    name: "Review persona",
    version: "1.0.0",
    description: "A bounded review persona.",
    license: "MIT",
    capabilities: ["template"],
    source: "author",
  });
  fs.rmSync(directory, { recursive: true, force: true });
});

test("plugin validator rejects executable or unlicensed manifest claims", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-plugin-"),
  );
  const manifestPath = path.join(directory, "plugin.json");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      id: "unsafe-plugin",
      name: "Unsafe",
      version: "1.0.0",
      description: "No",
      license: "Proprietary",
      capabilities: ["exec"],
    }),
  );
  assert.throws(() => validatePluginFile(manifestPath), /explicit MIT/);
  fs.rmSync(directory, { recursive: true, force: true });
});
