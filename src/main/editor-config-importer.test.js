const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { importEditorConfig } = require("./editor-config-importer");

test("imports bounded Neovim, Emacs, Zed, Vim, and Sublime metadata without evaluating config", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-editors-"));
  fs.mkdirSync(path.join(root, ".zed"));
  fs.writeFileSync(
    path.join(root, "init.lua"),
    'require("secret-plugin")\nvim.keymap.set("n", "x", "secret-command")',
  );
  fs.writeFileSync(path.join(root, "init.el"), "(use-package secret-package)");
  fs.writeFileSync(
    path.join(root, ".vimrc"),
    "set number\nPlug 'secret-plugin'",
  );
  fs.writeFileSync(
    path.join(root, ".zed/settings.json"),
    '{"theme":"Spartan","secret":"hidden"}',
  );
  fs.writeFileSync(
    path.join(root, "Spartan.sublime-project"),
    '{"folders":[{"path":"."}],"settings":{"secret":"hidden"}}',
  );
  const result = importEditorConfig(root);
  assert.equal(result.execution, "read-only");
  assert.equal(result.credentials, false);
  assert.equal(result.files.length, 5);
  assert.equal(JSON.stringify(result).includes("secret-plugin"), false);
  assert.equal(
    result.files.find((file) => file.editor === "zed").summary.keyCount,
    2,
  );
  assert.equal(
    result.files.find((file) => file.editor === "sublime").summary.keyCount,
    2,
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test("rejects invalid editor JSON, symlinked config, and relative paths", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-editors-"));
  fs.mkdirSync(path.join(root, ".zed"));
  fs.writeFileSync(path.join(root, ".zed/settings.json"), "not-json");
  assert.throws(
    () => importEditorConfig(root, { editors: ["zed"] }),
    /Invalid editor JSON/,
  );
  fs.rmSync(path.join(root, ".zed/settings.json"));
  fs.writeFileSync(path.join(root, "broken.sublime-project"), "not-json");
  assert.throws(
    () => importEditorConfig(root, { editors: ["sublime"] }),
    /Invalid editor JSON/,
  );
  fs.writeFileSync(path.join(root, "real.lua"), "print('ok')");
  fs.symlinkSync(path.join(root, "real.lua"), path.join(root, "init.lua"));
  assert.throws(
    () => importEditorConfig(root, { editors: ["neovim"] }),
    /symlink/,
  );
  assert.throws(() => importEditorConfig("relative"), /must be absolute/);
  fs.rmSync(root, { recursive: true, force: true });
});

test("reports folders without supported editor configuration", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-editors-empty-"),
  );
  assert.equal(importEditorConfig(root).present, false);
  fs.rmSync(root, { recursive: true, force: true });
});
