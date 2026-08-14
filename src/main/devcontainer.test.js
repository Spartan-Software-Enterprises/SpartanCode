const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  createDevContainerConfig,
  writeDevContainerConfig,
} = require("./devcontainer");

test("generates a bounded stack-specific user-project dev container", () => {
  const config = createDevContainerConfig({
    name: "Mobile product",
    preset: "android",
    forwardPorts: [3000, 8081, 3000],
  });
  assert.equal(config.image, "mcr.microsoft.com/devcontainers/base:ubuntu");
  assert.deepEqual(config.forwardPorts, [3000, 8081]);
  assert.ok(
    config.customizations.vscode.extensions.includes(
      "ms-playwright.playwright",
    ),
  );
});

test("writes inside the approved project and refuses accidental overwrite", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-devcontainer-"),
  );
  fs.mkdirSync(path.join(root, "project"));
  const first = writeDevContainerConfig(root, "project", {
    name: "Project",
    preset: "node",
  });
  assert.equal(fs.existsSync(first.path), true);
  assert.throws(
    () => writeDevContainerConfig(root, "project", { name: "Project" }),
    /explicit overwrite/,
  );
  assert.throws(
    () => writeDevContainerConfig(root, "../outside", { name: "Project" }),
    /escapes/,
  );
  fs.rmSync(root, { recursive: true, force: true });
});
