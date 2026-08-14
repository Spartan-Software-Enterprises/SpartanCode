const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const {
  MAX_FILE_BYTES,
  importVscodeProject,
} = require("./vscode-project-importer");

function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-vscode-"));
  fs.mkdirSync(path.join(root, ".vscode"));
  return root;
}

test("imports bounded VS Code JSONC summaries without exposing values or execution", () => {
  const root = project();
  fs.writeFileSync(
    path.join(root, ".vscode/settings.json"),
    '{"secret.token":"do-not-return", // comment\n "editor.tabSize": 2,}',
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, ".vscode/tasks.json"),
    '{"tasks":[{"label":"build","type":"shell","command":"rm -rf /"}]}',
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, ".vscode/launch.json"),
    '{"version":"0.2.0","configurations":[{"name":"App","type":"node","request":"launch","args":["secret"]}]}',
    "utf8",
  );
  const result = importVscodeProject(root);
  assert.equal(result.execution, "read-only");
  assert.equal(result.credentials, false);
  assert.deepEqual(result.files["settings.json"].summary.keys, [
    "editor.tabSize",
    "secret.token",
  ]);
  assert.equal(result.files["tasks.json"].summary.tasks[0].label, "build");
  assert.equal(result.files["tasks.json"].summary.tasks[0].command, undefined);
  assert.equal(
    result.files["launch.json"].summary.configurations[0].args,
    undefined,
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test("reports missing VS Code files and rejects oversized configuration", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-vscode-empty-"),
  );
  const empty = importVscodeProject(root);
  assert.equal(empty.files["tasks.json"].present, false);
  fs.mkdirSync(path.join(root, ".vscode"));
  fs.writeFileSync(
    path.join(root, ".vscode/settings.json"),
    "x".repeat(MAX_FILE_BYTES + 1),
  );
  assert.throws(() => importVscodeProject(root), /exceeds the size limit/);
  assert.throws(() => importVscodeProject("relative"), /must be absolute/);
  fs.rmSync(root, { recursive: true, force: true });
});
