const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const MAX_INPUT_BYTES = 64 * 1024;
const MAX_OUTPUT_BYTES = 256 * 1024;
const TIMEOUT_MS = 15_000;
const PLUGIN_ID = /^[a-z0-9][a-z0-9-]{0,47}$/;

function boundedJson(value) {
  const serialized = JSON.stringify(value ?? {});
  if (Buffer.byteLength(serialized, "utf8") > MAX_INPUT_BYTES)
    throw new Error("Marketplace plugin input is too large");
  return serialized;
}

function createMarketplacePluginRunner({
  stagingDir,
  workspacePath,
  spawnImpl = spawn,
  nodePath = process.execPath,
} = {}) {
  if (typeof stagingDir !== "string" || !path.isAbsolute(stagingDir))
    throw new Error("Marketplace staging directory must be absolute");
  if (typeof workspacePath !== "string" || !path.isAbsolute(workspacePath))
    throw new Error("A workspace is required to run a plugin");

  return {
    async run(plugin, input = {}) {
      if (!plugin || typeof plugin !== "object" || !PLUGIN_ID.test(plugin.id))
        throw new Error("Marketplace plugin id is invalid");
      if (plugin.runtime !== "node" || typeof plugin.entrypoint !== "string")
        throw new Error("Plugin is declarative and has no executable runtime");
      const activeManifestPath = path.join(
        workspacePath,
        ".spartancode",
        "plugins",
        `${plugin.id}.json`,
      );
      if (!fs.existsSync(activeManifestPath))
        throw new Error("Plugin must be explicitly activated before running");
      let activeManifest;
      try {
        activeManifest = JSON.parse(
          fs.readFileSync(activeManifestPath, "utf8"),
        );
      } catch {
        throw new Error("Activated plugin metadata is invalid");
      }
      if (
        activeManifest.source !== "marketplace" ||
        activeManifest.id !== plugin.id ||
        activeManifest.version !== plugin.version ||
        activeManifest.runtime !== "node" ||
        activeManifest.entrypoint !== plugin.entrypoint
      )
        throw new Error(
          "Activated plugin metadata does not match the signed entry",
        );
      const artifactPath = path.join(
        stagingDir,
        plugin.id,
        plugin.version,
        "artifact.bin",
      );
      if (!fs.existsSync(artifactPath))
        throw new Error("Activated plugin artifact is unavailable");
      const bytes = fs.readFileSync(artifactPath);
      if (plugin.artifactSha256) {
        const crypto = require("node:crypto");
        const digest = crypto.createHash("sha256").update(bytes).digest("hex");
        if (digest !== plugin.artifactSha256)
          throw new Error("Activated plugin integrity verification failed");
      }
      const serializedInput = boundedJson(input);
      return new Promise((resolve, reject) => {
        const child = spawnImpl(
          nodePath,
          [
            "--experimental-permission",
            "--no-addons",
            "--disable-proto=throw",
            artifactPath,
            serializedInput,
          ],
          {
            cwd: workspacePath,
            shell: false,
            windowsHide: true,
            env: { NODE_ENV: "production" },
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        let stdout = "";
        let stderr = "";
        let settled = false;
        let timeout;
        const finish = (result, error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          if (error) reject(error);
          else resolve(result);
        };
        const append = (target, chunk) => {
          const value = target + String(chunk);
          return value.slice(0, MAX_OUTPUT_BYTES);
        };
        child.stdout?.on("data", (chunk) => {
          stdout = append(stdout, chunk);
        });
        child.stderr?.on("data", (chunk) => {
          stderr = append(stderr, chunk);
        });
        child.on("error", (error) => finish(null, error));
        child.on("close", (code, signal) =>
          finish({ ok: code === 0, code, signal, stdout, stderr }, null),
        );
        timeout = setTimeout(() => {
          child.kill("SIGKILL");
          finish(null, new Error("Marketplace plugin timed out"));
        }, TIMEOUT_MS);
      });
    },
  };
}

module.exports = {
  MAX_INPUT_BYTES,
  MAX_OUTPUT_BYTES,
  createMarketplacePluginRunner,
};
