const fs = require("fs");
const path = require("path");

const PLUGIN_ID = /^[a-z0-9][a-z0-9-]{0,47}$/;
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const ALLOWED_LICENSES = new Set(["MIT", "Apache-2.0"]);
const ALLOWED_CAPABILITIES = new Set([
  "template",
  "persona",
  "audit",
  "runtime-adapter",
]);
const MAX_FILES = 32;
const MAX_BYTES = 64 * 1024;

const bundledPlugins = [
  {
    id: "workspace-audit",
    name: "Workspace audit",
    version: "1.0.0",
    description: "Summarize mission, artifact, and policy-visible activity.",
    license: "MIT",
    capabilities: ["audit"],
    source: "bundled",
  },
];

function validatePlugin(manifest, source = "workspace") {
  if (!manifest || typeof manifest !== "object")
    throw new Error("Plugin manifest must be an object");
  if (typeof manifest.id !== "string" || !PLUGIN_ID.test(manifest.id))
    throw new Error("Plugin id must be lowercase kebab-case");
  if (typeof manifest.name !== "string" || !manifest.name.trim())
    throw new Error("Plugin name is required");
  if (typeof manifest.version !== "string" || !VERSION.test(manifest.version))
    throw new Error("Plugin version must use semantic versioning");
  if (typeof manifest.description !== "string" || !manifest.description.trim())
    throw new Error("Plugin description is required");
  if (!ALLOWED_LICENSES.has(manifest.license))
    throw new Error("Plugin requires an explicit MIT or Apache-2.0 license");
  if (
    !Array.isArray(manifest.capabilities) ||
    !manifest.capabilities.length ||
    manifest.capabilities.some(
      (capability) => !ALLOWED_CAPABILITIES.has(capability),
    )
  )
    throw new Error("Plugin capabilities are not allowed");
  return {
    id: manifest.id,
    name: manifest.name.trim(),
    version: manifest.version,
    description: manifest.description.trim(),
    license: manifest.license,
    capabilities: [...manifest.capabilities],
    source,
  };
}

function loadWorkspacePlugins(workspacePath) {
  if (typeof workspacePath !== "string" || !workspacePath) return [];
  const root = path.resolve(workspacePath, ".spartancode", "plugins");
  if (!fs.existsSync(root)) return [];
  const files = fs
    .readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isFile() && entry.name.endsWith(".json"))
        return [path.join(root, entry.name)];
      if (!entry.isDirectory() || !PLUGIN_ID.test(entry.name)) return [];
      const manifest = path.join(root, entry.name, "plugin.json");
      return fs.existsSync(manifest) ? [manifest] : [];
    })
    .slice(0, MAX_FILES);
  const plugins = [];
  for (const filePath of files) {
    try {
      if (fs.statSync(filePath).size > MAX_BYTES) continue;
      const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
      plugins.push(validatePlugin(manifest, "workspace"));
    } catch {
      // Invalid or unlicensed manifests never block startup.
    }
  }
  return plugins.sort((left, right) => left.id.localeCompare(right.id));
}

function listPlugins(workspacePath) {
  const plugins = [...bundledPlugins, ...loadWorkspacePlugins(workspacePath)];
  const byId = new Map(plugins.map((plugin) => [plugin.id, plugin]));
  return [...byId.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

module.exports = {
  ALLOWED_CAPABILITIES,
  bundledPlugins,
  listPlugins,
  loadWorkspacePlugins,
  validatePlugin,
};
