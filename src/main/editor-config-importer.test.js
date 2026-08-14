const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { importEditorConfig } = require("./editor-config-importer");

test("imports bounded editor and terminal-agent metadata without evaluating config", () => {
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
  fs.writeFileSync(
    path.join(root, "Spartan.sublime-workspace"),
    '{"folders":[],"buffers":[],"groups":[]}',
  );
  fs.mkdirSync(path.join(root, ".continue"));
  fs.writeFileSync(
    path.join(root, ".aider.conf.yml"),
    "api-key: secret-value\nmodel: local\n",
  );
  fs.writeFileSync(path.join(root, "AGENTS.md"), "secret agent instructions");
  fs.writeFileSync(path.join(root, "CLAUDE.md"), "secret claude instructions");
  fs.writeFileSync(path.join(root, "GEMINI.md"), "secret gemini instructions");
  fs.writeFileSync(path.join(root, ".windsurfrules"), "secret windsurf rules");
  fs.mkdirSync(path.join(root, ".github"));
  fs.writeFileSync(
    path.join(root, ".github/copilot-instructions.md"),
    "secret copilot instructions",
  );
  fs.mkdirSync(path.join(root, ".cursor/rules"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".cursor/rules/project.mdc"),
    "secret cursor rule",
  );
  fs.writeFileSync(path.join(root, "opencode.json"), '{"provider":"secret"}');
  fs.writeFileSync(path.join(root, ".continue/config.json"), '{"models":[]}');
  fs.mkdirSync(path.join(root, ".clinerules"));
  fs.writeFileSync(path.join(root, ".clinerules/project.md"), "secret rule");
  fs.mkdirSync(path.join(root, ".roo/rules"), { recursive: true });
  fs.writeFileSync(path.join(root, ".roo/rules/project.md"), "secret rule");
  const result = importEditorConfig(root);
  assert.equal(result.execution, "read-only");
  assert.equal(result.credentials, false);
  assert.equal(result.files.length, 17);
  assert.equal(JSON.stringify(result).includes("secret-plugin"), false);
  assert.equal(
    result.files.find((file) => file.editor === "zed").summary.keyCount,
    2,
  );
  assert.equal(
    result.files.find((file) => file.editor === "sublime").summary.keyCount,
    2,
  );
  assert.equal(
    result.files.filter((file) => file.editor === "sublime").length,
    2,
  );
  assert.equal(
    result.files.filter((file) => file.editor === "terminal-agents").length,
    11,
  );
  assert.equal(JSON.stringify(result).includes("secret-value"), false);
  for (const secret of [
    "secret agent instructions",
    "secret claude instructions",
    "secret gemini instructions",
    "secret windsurf rules",
    "secret copilot instructions",
    "secret cursor rule",
  ]) {
    assert.equal(JSON.stringify(result).includes(secret), false);
  }
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
  fs.rmSync(path.join(root, "init.lua"));
  fs.rmSync(path.join(root, ".zed"), { recursive: true, force: true });
  fs.mkdirSync(path.join(root, "real-rules"));
  fs.writeFileSync(path.join(root, "real-rules/project.md"), "rule");
  fs.symlinkSync(
    path.join(root, "real-rules"),
    path.join(root, ".roo-rules-link"),
    "dir",
  );
  fs.mkdirSync(path.join(root, ".roo"));
  fs.symlinkSync(
    path.join(root, "real-rules"),
    path.join(root, ".roo/rules"),
    "dir",
  );
  assert.throws(
    () => importEditorConfig(root, { editors: ["terminal-agents"] }),
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
