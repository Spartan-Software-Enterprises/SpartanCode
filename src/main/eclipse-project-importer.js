const fs = require("node:fs");
const path = require("node:path");

const MAX_FILE_BYTES = 256 * 1024;
const FILES = [".project", ".classpath"];

function parseXml(source, fileName) {
  if (typeof source !== "string" || /<!DOCTYPE|<!ENTITY/i.test(source))
    throw new Error(`Unsafe Eclipse XML: ${fileName}`);
  const tokens = source.match(/<!--[^]*?-->|<[^>]+>/g) || [];
  if (!tokens.length) throw new Error(`Invalid Eclipse XML: ${fileName}`);
  const stack = [];
  const names = [];
  for (const token of tokens) {
    if (token.startsWith("<!--") || token.startsWith("<?")) continue;
    if (token.startsWith("</")) {
      if (stack.pop() !== token.slice(2, -1).trim())
        throw new Error(`Invalid Eclipse XML: ${fileName}`);
      continue;
    }
    const opening = token.match(/^<([A-Za-z_][\w:.-]*)([^>]*)>$/);
    if (!opening) throw new Error(`Invalid Eclipse XML: ${fileName}`);
    const [, name, body] = opening;
    names.push(name);
    if (!/\/\s*$/.test(body)) stack.push(name);
  }
  if (stack.length) throw new Error(`Invalid Eclipse XML: ${fileName}`);
  return {
    root: names[0] || null,
    elementNames: [...new Set(names)].sort().slice(0, 100),
  };
}

function summarizeClasspath(source) {
  const entries = [];
  for (const match of source.matchAll(
    /<classpathentry\b[^>]*\bkind="([^"]+)"/g,
  ))
    entries.push(match[1]);
  return {
    entryCount: entries.length,
    kinds: [...new Set(entries)].sort().slice(0, 50),
  };
}

function readBounded(filePath, relative, readFileImpl) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile())
    throw new Error(`Eclipse metadata is not a file: ${relative}`);
  if (stat.size > MAX_FILE_BYTES)
    throw new Error(`Eclipse metadata exceeds the size limit: ${relative}`);
  return readFileImpl(filePath, "utf8");
}

function importEclipseProject(
  projectPath,
  { readFileImpl = fs.readFileSync } = {},
) {
  if (typeof projectPath !== "string" || !path.isAbsolute(projectPath))
    throw new Error("Eclipse project path must be absolute");
  const projectRoot = fs.realpathSync(projectPath);
  if (!fs.statSync(projectRoot).isDirectory())
    throw new Error("Eclipse project is not a directory");
  const result = {
    schemaVersion: 1,
    adapter: {
      id: "eclipse-project",
      kind: "connector",
      execution: "read-only",
    },
    projectPath: projectRoot,
    execution: "read-only",
    credentials: false,
    files: {},
    buildSystems: {
      maven: fs.existsSync(path.join(projectRoot, "pom.xml")),
      gradle: [
        "build.gradle",
        "build.gradle.kts",
        "settings.gradle",
        "settings.gradle.kts",
      ].some((name) => fs.existsSync(path.join(projectRoot, name))),
    },
    unsupported: [
      "plugin-execution",
      "osgi-execution",
      "maven-execution",
      "gradle-execution",
      "credential-import",
    ],
  };
  for (const fileName of FILES) {
    const filePath = path.join(projectRoot, fileName);
    if (!fs.existsSync(filePath)) {
      result.files[fileName] = { present: false };
      continue;
    }
    if (fs.realpathSync(filePath) !== filePath)
      throw new Error(`Eclipse metadata symlink is not allowed: ${fileName}`);
    const source = readBounded(filePath, fileName, readFileImpl);
    result.files[fileName] = {
      present: true,
      summary:
        fileName === ".classpath"
          ? summarizeClasspath(source)
          : parseXml(source, fileName),
    };
  }
  result.present = FILES.some((fileName) => result.files[fileName].present);
  return result;
}

module.exports = {
  MAX_FILE_BYTES,
  importEclipseProject,
  parseXml,
  summarizeClasspath,
};
