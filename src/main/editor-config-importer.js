const fs = require("node:fs");
const path = require("node:path");

const MAX_FILE_BYTES = 256 * 1024;
const MAX_FILES = 64;
const CONFIG_FILES = {
  neovim: ["init.lua", "init.vim", ".nvim.lua", ".nvimrc"],
  vim: [".vimrc", ".vim/init.vim"],
  emacs: ["init.el", ".emacs", ".emacs.d/init.el"],
  zed: [".zed/settings.json", ".zed/tasks.json", ".zed/debug.json"],
  sublime: [],
  "terminal-agents": [
    "AGENTS.md",
    "CLAUDE.md",
    "GEMINI.md",
    ".aider.conf.yml",
    ".codeium/instructions.md",
    ".amazonq/rules",
    ".kiro/steering",
    ".augment/rules",
    ".goosehints",
    ".factory/rules",
    ".windsurfrules",
    "opencode.json",
    "opencode.jsonc",
    ".clinerules",
    ".github/copilot-instructions.md",
    ".cursor/rules",
    ".continue/config.json",
    ".roo/rules",
  ],
};

function scriptSummary(source) {
  const lines = source.split(/\r?\n/);
  return {
    lineCount: Math.min(lines.length, 10000),
    nonEmptyLines: Math.min(lines.filter((line) => line.trim()).length, 10000),
    integrationStatementCount: Math.min(
      (
        source.match(
          /\b(?:require|import|use-package|Plug|lua|set|autocmd)\b/g,
        ) || []
      ).length,
      1000,
    ),
  };
}

function jsonSummary(source, fileName) {
  try {
    const value = JSON.parse(source);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("not an object");
    return {
      keyCount: Object.keys(value).length,
      keys: Object.keys(value).sort().slice(0, 200),
    };
  } catch {
    throw new Error(`Invalid editor JSON: ${fileName}`);
  }
}

function readConfig(filePath, relative, editor, readFileImpl) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile())
    throw new Error(`Editor configuration is not a file: ${relative}`);
  if (stat.size > MAX_FILE_BYTES)
    throw new Error(`Editor configuration exceeds the size limit: ${relative}`);
  const source = readFileImpl(filePath, "utf8");
  return {
    file: relative,
    editor,
    summary: ["zed", "sublime"].includes(editor)
      ? jsonSummary(source, relative)
      : scriptSummary(source),
  };
}

function configFilesForEditor(projectRoot, editor) {
  if (editor === "sublime")
    return fs
      .readdirSync(projectRoot, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          /\.sublime-(?:project|workspace)$/.test(entry.name) &&
          entry.name.length <= 160,
      )
      .map((entry) => entry.name)
      .sort()
      .slice(0, MAX_FILES);
  if (editor !== "terminal-agents") return CONFIG_FILES[editor] || [];
  const files = [];
  for (const relative of CONFIG_FILES[editor]) {
    const absolute = path.join(projectRoot, relative);
    if (!fs.existsSync(absolute)) continue;
    const directoryStat = fs.lstatSync(absolute);
    if (directoryStat.isSymbolicLink())
      throw new Error(
        `Editor configuration symlink is not allowed: ${relative}`,
      );
    if (!directoryStat.isDirectory()) {
      files.push(relative);
      continue;
    }
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.length <= 160)
        files.push(path.join(relative, entry.name));
    }
  }
  return files.sort().slice(0, MAX_FILES);
}

function importEditorConfig(
  projectPath,
  { editors = Object.keys(CONFIG_FILES), readFileImpl = fs.readFileSync } = {},
) {
  if (typeof projectPath !== "string" || !path.isAbsolute(projectPath))
    throw new Error("Editor project path must be absolute");
  const projectRoot = fs.realpathSync(projectPath);
  if (!fs.statSync(projectRoot).isDirectory())
    throw new Error("Editor project is not a directory");
  const result = {
    schemaVersion: 1,
    adapter: { id: "editor-config", kind: "connector", execution: "read-only" },
    projectPath: projectRoot,
    execution: "read-only",
    credentials: false,
    files: [],
    unsupported: [
      "plugin-execution",
      "script-evaluation",
      "lsp-launch",
      "dap-launch",
      "credential-import",
    ],
  };
  for (const editor of editors) {
    if (!Object.prototype.hasOwnProperty.call(CONFIG_FILES, editor)) continue;
    for (const relative of configFilesForEditor(projectRoot, editor)) {
      const filePath = path.join(projectRoot, relative);
      if (!fs.existsSync(filePath)) continue;
      if (fs.realpathSync(filePath) !== filePath)
        throw new Error(
          `Editor configuration symlink is not allowed: ${relative}`,
        );
      if (result.files.length >= MAX_FILES)
        throw new Error("Editor configuration file count exceeds the limit");
      result.files.push(readConfig(filePath, relative, editor, readFileImpl));
    }
  }
  result.present = result.files.length > 0;
  return result;
}

module.exports = {
  CONFIG_FILES,
  MAX_FILE_BYTES,
  importEditorConfig,
  scriptSummary,
};
