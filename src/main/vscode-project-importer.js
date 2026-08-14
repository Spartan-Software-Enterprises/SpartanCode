const fs = require("node:fs");
const path = require("node:path");

const MAX_FILE_BYTES = 256 * 1024;
const FILES = ["settings.json", "tasks.json", "launch.json"];

function stripJsonComments(source) {
  let output = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (inString) {
      output += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      output += character;
    } else if (character === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      output += "\n";
    } else if (character === "/" && next === "*") {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      )
        index += 1;
      index += 1;
      output += " ";
    } else {
      output += character;
    }
  }
  return output.replace(/,\s*([}\]])/g, "$1");
}

function parseJsonc(source, fileName) {
  try {
    return JSON.parse(stripJsonComments(source));
  } catch {
    throw new Error(`Invalid VS Code JSONC: ${fileName}`);
  }
}

function boundedRead(filePath, readFileImpl) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) throw new Error("VS Code configuration is not a file");
  if (stat.size > MAX_FILE_BYTES)
    throw new Error("VS Code configuration exceeds the size limit");
  return readFileImpl(filePath, "utf8");
}

function summarizeSettings(value) {
  if (!value || Array.isArray(value) || typeof value !== "object")
    throw new Error("VS Code settings must be an object");
  return {
    keyCount: Object.keys(value).length,
    keys: Object.keys(value).sort().slice(0, 200),
  };
}

function summarizeTasks(value) {
  const tasks = Array.isArray(value) ? value : value?.tasks;
  if (!Array.isArray(tasks))
    throw new Error("VS Code tasks must contain a tasks array");
  return {
    count: tasks.length,
    tasks: tasks.slice(0, 100).map((task) => ({
      label: typeof task.label === "string" ? task.label : null,
      type: typeof task.type === "string" ? task.type : null,
      group: typeof task.group === "string" ? task.group : null,
    })),
  };
}

function summarizeLaunch(value) {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray(value.configurations)
  )
    throw new Error("VS Code launch must contain a configurations array");
  return {
    version: typeof value.version === "string" ? value.version : null,
    count: value.configurations.length,
    configurations: value.configurations.slice(0, 100).map((configuration) => ({
      name: typeof configuration.name === "string" ? configuration.name : null,
      type: typeof configuration.type === "string" ? configuration.type : null,
      request:
        typeof configuration.request === "string"
          ? configuration.request
          : null,
    })),
  };
}

function importVscodeProject(
  projectPath,
  { readFileImpl = fs.readFileSync } = {},
) {
  if (typeof projectPath !== "string" || !path.isAbsolute(projectPath))
    throw new Error("VS Code project path must be absolute");
  const projectRoot = fs.realpathSync(projectPath);
  if (!fs.statSync(projectRoot).isDirectory())
    throw new Error("VS Code project is not a directory");
  const vscodeDirectory = path.join(projectRoot, ".vscode");
  const result = {
    schemaVersion: 1,
    adapter: {
      id: "vscode-project",
      kind: "connector",
      execution: "read-only",
    },
    projectPath: projectRoot,
    execution: "read-only",
    credentials: false,
    files: {},
    unsupported: [],
  };
  for (const fileName of FILES) {
    const filePath = path.join(vscodeDirectory, fileName);
    if (!fs.existsSync(filePath)) {
      result.files[fileName] = { present: false };
      continue;
    }
    const canonicalFile = fs.realpathSync(filePath);
    if (canonicalFile !== filePath)
      throw new Error(
        `VS Code configuration symlink is not allowed: ${fileName}`,
      );
    const parsed = parseJsonc(boundedRead(filePath, readFileImpl), fileName);
    result.files[fileName] = {
      present: true,
      summary:
        fileName === "settings.json"
          ? summarizeSettings(parsed)
          : fileName === "tasks.json"
            ? summarizeTasks(parsed)
            : summarizeLaunch(parsed),
    };
  }
  return result;
}

module.exports = { MAX_FILE_BYTES, importVscodeProject, stripJsonComments };
