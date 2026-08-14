const fs = require("node:fs");
const path = require("node:path");

const MAX_FILE_BYTES = 256 * 1024;
const MAX_FILES = 128;

function parseXmlMetadata(source, fileName) {
  if (typeof source !== "string" || /<!DOCTYPE|<!ENTITY/i.test(source))
    throw new Error(`Unsafe Visual Studio XML: ${fileName}`);
  const tokens = source.match(/<!--[^]*?-->|<[^>]+>/g) || [];
  if (!tokens.length) throw new Error(`Invalid Visual Studio XML: ${fileName}`);
  const stack = [];
  const elements = [];
  let root = null;
  for (const token of tokens) {
    if (token.startsWith("<!--") || token.startsWith("<?")) continue;
    if (token.startsWith("</")) {
      if (stack.pop() !== token.slice(2, -1).trim())
        throw new Error(`Invalid Visual Studio XML: ${fileName}`);
      continue;
    }
    const opening = token.match(/^<([A-Za-z_][\w:.-]*)([^>]*)>$/);
    if (!opening) throw new Error(`Invalid Visual Studio XML: ${fileName}`);
    const [, name, body] = opening;
    if (!root) root = name;
    elements.push(name);
    if (!/\/\s*$/.test(body)) stack.push(name);
  }
  if (stack.length || !root)
    throw new Error(`Invalid Visual Studio XML: ${fileName}`);
  return {
    root,
    elementCount: elements.length,
    elementNames: [...new Set(elements)].sort().slice(0, 200),
  };
}

function readBounded(filePath, relative, readFileImpl) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile())
    throw new Error(`Visual Studio metadata is not a file: ${relative}`);
  if (stat.size > MAX_FILE_BYTES)
    throw new Error(
      `Visual Studio metadata exceeds the size limit: ${relative}`,
    );
  return readFileImpl(filePath, "utf8");
}

function summarizeSolution(source, fileName) {
  const projects = [];
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(
      /^Project\("[^\"]+"\)\s*=\s*"([^\"]+)",\s*"([^\"]+)",\s*"[^\"]+"/,
    );
    if (match) projects.push({ name: match[1], path: match[2] });
  }
  return {
    file: fileName,
    projectCount: projects.length,
    projects: projects.slice(0, 100),
  };
}

function importVisualStudioProject(
  projectPath,
  { readFileImpl = fs.readFileSync } = {},
) {
  if (typeof projectPath !== "string" || !path.isAbsolute(projectPath))
    throw new Error("Visual Studio project path must be absolute");
  const projectRoot = fs.realpathSync(projectPath);
  if (!fs.statSync(projectRoot).isDirectory())
    throw new Error("Visual Studio project is not a directory");
  const names = fs
    .readdirSync(projectRoot)
    .filter((name) => /\.(sln|slnx|csproj|vcxproj|fsproj)$/.test(name))
    .slice(0, MAX_FILES);
  const result = {
    schemaVersion: 1,
    adapter: {
      id: "visual-studio-project",
      kind: "connector",
      execution: "read-only",
    },
    projectPath: projectRoot,
    execution: "read-only",
    credentials: false,
    files: { solutions: [], projects: [] },
    unsupported: [
      "vsix-execution",
      "msbuild-execution",
      "debugger-execution",
      "credential-import",
    ],
  };
  for (const name of names) {
    const filePath = path.join(projectRoot, name);
    if (fs.realpathSync(filePath) !== filePath)
      throw new Error(`Visual Studio metadata symlink is not allowed: ${name}`);
    const source = readBounded(filePath, name, readFileImpl);
    if (/\.(sln|slnx)$/.test(name))
      result.files.solutions.push(summarizeSolution(source, name));
    else
      result.files.projects.push({
        file: name,
        summary: parseXmlMetadata(source, name),
      });
  }
  result.present = names.length > 0;
  return result;
}

module.exports = {
  MAX_FILE_BYTES,
  importVisualStudioProject,
  parseXmlMetadata,
  summarizeSolution,
};
