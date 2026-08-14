const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createMarketplacePluginRunner } = require("./plugin-runner");

test("marketplace runner rejects declarative plugins", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-runner-"));
  const runner = createMarketplacePluginRunner({
    stagingDir: root,
    workspacePath: root,
  });
  await assert.rejects(
    runner.run({ id: "safe", runtime: null, entrypoint: null }),
    /declarative/,
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test("marketplace runner verifies integrity and launches without shell", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-runner-"));
  const versionDir = path.join(root, "safe-plugin", "1.0.0");
  fs.mkdirSync(versionDir, { recursive: true });
  const artifact = Buffer.from("console.log('ok')\n");
  fs.writeFileSync(path.join(versionDir, "artifact.bin"), artifact);
  const workspacePath = path.join(root, "workspace");
  fs.mkdirSync(path.join(workspacePath, ".spartancode", "plugins"), {
    recursive: true,
  });
  const digest = crypto.createHash("sha256").update(artifact).digest("hex");
  fs.writeFileSync(
    path.join(workspacePath, ".spartancode", "plugins", "safe-plugin.json"),
    JSON.stringify({
      id: "safe-plugin",
      version: "1.0.0",
      source: "marketplace",
      runtime: "node",
      entrypoint: "index.js",
      artifactSha256: digest,
    }),
  );
  const calls = [];
  const runner = createMarketplacePluginRunner({
    stagingDir: root,
    workspacePath,
    nodePath: "/usr/bin/node",
    spawnImpl: (binary, args, options) => {
      calls.push({ binary, args, options });
      const listeners = new Map();
      return {
        stdout: { on() {} },
        stderr: { on() {} },
        on(event, callback) {
          listeners.set(event, callback);
          if (event === "close") setImmediate(() => callback(0, null));
        },
        kill() {},
      };
    },
  });
  const result = await runner.run(
    {
      id: "safe-plugin",
      version: "1.0.0",
      runtime: "node",
      entrypoint: "index.js",
      artifactSha256: digest,
    },
    { action: "inspect" },
  );
  assert.equal(result.ok, true);
  assert.equal(calls[0].options.shell, false);
  assert.equal(calls[0].options.env.NODE_ENV, "production");
  assert.ok(calls[0].args.includes("--experimental-permission"));
  fs.rmSync(root, { recursive: true, force: true });
});
