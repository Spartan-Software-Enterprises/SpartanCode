const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { listPlugins, validatePlugin } = require("./plugin-registry");

test("plugin manifests require bounded metadata, explicit license, and safe capabilities", () => {
  assert.deepEqual(
    validatePlugin({
      id: "starter-template",
      name: "Starter template",
      version: "1.0.0",
      description: "Creates a starter workspace.",
      license: "MIT",
      capabilities: ["template"],
    }).source,
    "workspace",
  );
  assert.throws(
    () =>
      validatePlugin({
        id: "unsafe",
        name: "Unsafe",
        version: "1.0.0",
        description: "x",
        license: "GPL-3.0",
        capabilities: ["template"],
      }),
    /explicit MIT/,
  );
  assert.throws(
    () =>
      validatePlugin({
        id: "shell",
        name: "Shell",
        version: "1.0.0",
        description: "x",
        license: "MIT",
        capabilities: ["shell"],
      }),
    /capabilities/,
  );
});

test("workspace plugin discovery ignores invalid manifests and preserves bundled plugins", () => {
  const workspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-plugins-"),
  );
  const plugins = path.join(workspace, ".spartancode", "plugins");
  fs.mkdirSync(plugins, { recursive: true });
  fs.writeFileSync(
    path.join(plugins, "valid.json"),
    JSON.stringify({
      id: "team-persona",
      name: "Team persona",
      version: "1.2.0",
      description: "A shared planning persona.",
      license: "Apache-2.0",
      capabilities: ["persona"],
    }),
  );
  fs.writeFileSync(
    path.join(plugins, "invalid.json"),
    JSON.stringify({ id: "invalid", license: "Unknown" }),
  );
  const pluginsFound = listPlugins(workspace);
  assert.ok(pluginsFound.some((plugin) => plugin.id === "workspace-audit"));
  assert.ok(pluginsFound.some((plugin) => plugin.id === "team-persona"));
  assert.ok(!pluginsFound.some((plugin) => plugin.id === "invalid"));
  fs.rmSync(workspace, { recursive: true, force: true });
});
