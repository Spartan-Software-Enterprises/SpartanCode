const fs = require("node:fs");
const path = require("node:path");

const MAX_FILE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 128;
const SHARED_FILES = ["misc.xml", "modules.xml", "gradle.xml", "kotlinc.xml"];

function attributes(text) {
  const result = {};
  const pattern = /([A-Za-z_][\w:.-]*)\s*=\s*"([^"<>]*)"/g;
  let match;
  while ((match = pattern.exec(text))) result[match[1]] = match[2];
  return result;
}

function summarizeXml(source, fileName) {
  if (typeof source !== "string" || /<!DOCTYPE|<!ENTITY/i.test(source))
    throw new Error(`Unsafe JetBrains XML: ${fileName}`);
  const tokens = source.match(/<!--[^]*?-->|<[^>]+>/g) || [];
  if (!tokens.length || !/^\s*<\?xml/.test(source))
    throw new Error(`Invalid JetBrains XML: ${fileName}`);
  const stack = [];
  let root = null;
  const components = [];
  const configurations = [];
  const modules = [];
  for (const token of tokens) {
    if (token.startsWith("<!--") || token.startsWith("<?")) continue;
    if (token.startsWith("</")) {
      const name = token.slice(2, -1).trim();
      if (stack.pop() !== name)
        throw new Error(`Invalid JetBrains XML: ${fileName}`);
      continue;
    }
    const opening = token.match(/^<([A-Za-z_][\w:.-]*)([^>]*)>$/);
    if (!opening) throw new Error(`Invalid JetBrains XML: ${fileName}`);
    const [, name, body] = opening;
    const selfClosing = /\/\s*$/.test(body);
    const values = attributes(body);
    if (!root) root = name;
    if (name === "component" && typeof values.name === "string")
      components.push(values.name);
    if (name === "configuration")
      configurations.push({
        name: typeof values.name === "string" ? values.name : null,
        type: typeof values.type === "string" ? values.type : null,
      });
    if (name === "module")
      modules.push({
        name: typeof values.name === "string" ? values.name : null,
        type: typeof values.type === "string" ? values.type : null,
      });
    if (!selfClosing) stack.push(name);
  }
  if (stack.length || !root)
    throw new Error(`Invalid JetBrains XML: ${fileName}`);
  return {
    root,
    components: components.slice(0, 100),
    configurations: configurations.slice(0, 100),
    modules: modules.slice(0, 100),
  };
}

function readXml(filePath, relative, total, readFileImpl) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile())
    throw new Error(`JetBrains metadata is not a file: ${relative}`);
  if (stat.size > MAX_FILE_BYTES)
    throw new Error(`JetBrains metadata exceeds the size limit: ${relative}`);
  total.bytes += stat.size;
  if (total.bytes > MAX_TOTAL_BYTES)
    throw new Error("JetBrains metadata exceeds the total size limit");
  return {
    name: relative,
    summary: summarizeXml(readFileImpl(filePath, "utf8"), relative),
  };
}

function markerFiles(projectRoot) {
  const names = [
    ["cmake", ["CMakeLists.txt", "CMakePresets.json"]],
    [
      "gradle",
      [
        "build.gradle",
        "settings.gradle",
        "build.gradle.kts",
        "settings.gradle.kts",
      ],
    ],
    ["maven", ["pom.xml"]],
    ["dotnet", ["*.sln", "*.slnx", "*.csproj", "*.fsproj"]],
  ];
  return Object.fromEntries(
    names.map(([kind, candidates]) => [
      kind,
      candidates.flatMap((candidate) =>
        candidate.startsWith("*")
          ? fs
              .readdirSync(projectRoot)
              .filter((name) => name.endsWith(candidate.slice(1)))
          : fs.existsSync(path.join(projectRoot, candidate))
            ? [candidate]
            : [],
      ),
    ]),
  );
}

function importJetbrainsProject(
  projectPath,
  { readFileImpl = fs.readFileSync } = {},
) {
  if (typeof projectPath !== "string" || !path.isAbsolute(projectPath))
    throw new Error("JetBrains project path must be absolute");
  const projectRoot = fs.realpathSync(projectPath);
  if (!fs.statSync(projectRoot).isDirectory())
    throw new Error("JetBrains project is not a directory");
  const ideaDirectory = path.join(projectRoot, ".idea");
  const result = {
    schemaVersion: 1,
    adapter: {
      id: "jetbrains-project",
      kind: "connector",
      execution: "read-only",
    },
    projectPath: projectRoot,
    execution: "read-only",
    credentials: false,
    products: [],
    files: {
      ideaDirectory: { present: false },
      settings: [],
      runConfigurations: [],
      modules: [],
    },
    buildSystems: markerFiles(projectRoot),
    unsupported: [
      "plugin-execution",
      "run-configuration-execution",
      "build-orchestration",
      "credential-import",
    ],
  };
  if (!fs.existsSync(ideaDirectory)) return result;
  if (fs.realpathSync(ideaDirectory) !== ideaDirectory)
    throw new Error("JetBrains .idea symlink is not allowed");
  const total = { bytes: 0 };
  const settings = [];
  for (const fileName of SHARED_FILES) {
    const filePath = path.join(ideaDirectory, fileName);
    if (!fs.existsSync(filePath)) continue;
    if (fs.realpathSync(filePath) !== filePath)
      throw new Error(`JetBrains metadata symlink is not allowed: ${fileName}`);
    settings.push(readXml(filePath, `.idea/${fileName}`, total, readFileImpl));
  }
  const runDirectory = path.join(ideaDirectory, "runConfigurations");
  const runConfigurations = [];
  if (fs.existsSync(runDirectory)) {
    if (fs.realpathSync(runDirectory) !== runDirectory)
      throw new Error("JetBrains run configuration symlink is not allowed");
    for (const fileName of fs
      .readdirSync(runDirectory)
      .filter((name) => name.endsWith(".xml"))
      .slice(0, MAX_FILES)) {
      const filePath = path.join(runDirectory, fileName);
      if (fs.realpathSync(filePath) !== filePath)
        throw new Error(
          `JetBrains metadata symlink is not allowed: ${fileName}`,
        );
      runConfigurations.push(
        readXml(
          filePath,
          `.idea/runConfigurations/${fileName}`,
          total,
          readFileImpl,
        ),
      );
    }
  }
  const moduleFiles = fs
    .readdirSync(projectRoot)
    .filter((name) => name.endsWith(".iml"))
    .slice(0, MAX_FILES);
  const modules = moduleFiles.map((fileName) =>
    readXml(path.join(projectRoot, fileName), fileName, total, readFileImpl),
  );
  result.files = {
    ideaDirectory: {
      present: true,
      xmlFileCount: settings.length + runConfigurations.length,
    },
    settings,
    runConfigurations,
    modules,
  };
  const markers = result.buildSystems;
  if (markers.dotnet.length) result.products.push("rider");
  if (
    markers.cmake.length ||
    fs.existsSync(path.join(ideaDirectory, "cmake.xml"))
  )
    result.products.push("clion");
  if (!result.products.length) result.products.push("intellij");
  return result;
}

module.exports = {
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  importJetbrainsProject,
  summarizeXml,
};
