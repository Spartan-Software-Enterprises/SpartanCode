const fs = require("node:fs");
const path = require("node:path");

const MAX_FILE_BYTES = 512 * 1024;

function boundedRead(filePath, relative, readFileImpl) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile())
    throw new Error(`Xcode metadata is not a file: ${relative}`);
  if (stat.size > MAX_FILE_BYTES)
    throw new Error(`Xcode metadata exceeds the size limit: ${relative}`);
  return readFileImpl(filePath, "utf8");
}

function summarizePbxproj(source, fileName) {
  if (
    typeof source !== "string" ||
    /(?:privateKey|PROVISIONING_PROFILE|CODE_SIGN_IDENTITY|DEVELOPMENT_TEAM)/i.test(
      source,
    )
  )
    throw new Error(`Xcode signing metadata is not importable: ${fileName}`);
  const products = [...source.matchAll(/productName\s*=\s*([^;]+);/g)]
    .map((match) => match[1].trim().replace(/^"|"$/g, ""))
    .filter((value) => /^[A-Za-z0-9_. -]{1,120}$/.test(value));
  const configurations = [...source.matchAll(/buildSettings\s*=\s*\{/g)].length;
  return {
    objectCount: (source.match(/\b[A-F0-9]{24}\b/g) || []).length,
    productNames: [...new Set(products)].slice(0, 100),
    buildConfigurationCount: Math.min(configurations, 100),
  };
}

function summarizeSwiftPackage(source) {
  const toolsVersion =
    source.match(/swift-tools-version:\s*([^\s]+)/)?.[1] || null;
  const declarations = [
    ...source.matchAll(/\b(?:name|products|dependencies|targets)\s*:/g),
  ].length;
  return { toolsVersion, declarationCount: Math.min(declarations, 100) };
}

function importXcodeProject(
  projectPath,
  { readFileImpl = fs.readFileSync } = {},
) {
  if (typeof projectPath !== "string" || !path.isAbsolute(projectPath))
    throw new Error("Xcode project path must be absolute");
  const projectRoot = fs.realpathSync(projectPath);
  if (!fs.statSync(projectRoot).isDirectory())
    throw new Error("Xcode project is not a directory");
  const result = {
    schemaVersion: 1,
    adapter: { id: "xcode-project", kind: "connector", execution: "read-only" },
    projectPath: projectRoot,
    execution: "read-only",
    credentials: false,
    files: { xcodeProjects: [], workspaces: [], swiftPackages: [] },
    unsupported: [
      "xcode-build",
      "signing",
      "simulator-execution",
      "scheme-execution",
      "credential-import",
    ],
  };
  for (const name of fs.readdirSync(projectRoot)) {
    if (name.endsWith(".xcodeproj")) {
      const filePath = path.join(projectRoot, name, "project.pbxproj");
      if (!fs.existsSync(filePath) || fs.realpathSync(filePath) !== filePath)
        throw new Error(
          `Xcode project metadata is unavailable or symlinked: ${name}`,
        );
      result.files.xcodeProjects.push({
        file: name,
        summary: summarizePbxproj(
          boundedRead(filePath, `${name}/project.pbxproj`, readFileImpl),
          name,
        ),
      });
    } else if (name.endsWith(".xcworkspace")) {
      const filePath = path.join(projectRoot, name, "contents.xcworkspacedata");
      if (fs.existsSync(filePath) && fs.realpathSync(filePath) === filePath)
        result.files.workspaces.push({ file: name, present: true });
    } else if (name === "Package.swift") {
      result.files.swiftPackages.push({
        file: name,
        summary: summarizeSwiftPackage(
          boundedRead(path.join(projectRoot, name), name, readFileImpl),
        ),
      });
    }
  }
  result.present = Object.values(result.files).some(
    (items) => items.length > 0,
  );
  return result;
}

module.exports = {
  MAX_FILE_BYTES,
  importXcodeProject,
  summarizePbxproj,
  summarizeSwiftPackage,
};
