#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function lockfileComponents(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lock = readJson(filePath);
  return Object.entries(lock.packages || {})
    .filter(([packagePath]) => packagePath.startsWith("node_modules/"))
    .map(([packagePath, metadata]) => ({
      name:
        typeof metadata.name === "string"
          ? metadata.name
          : packagePath.slice("node_modules/".length),
      version: metadata.version || "unknown",
      license:
        typeof metadata.license === "string"
          ? metadata.license
          : metadata.license?.type || "UNKNOWN",
      source: path.basename(filePath),
    }))
    .sort((left, right) =>
      `${left.name}@${left.version}`.localeCompare(
        `${right.name}@${right.version}`,
      ),
    );
}

function filesIn(directory) {
  if (!directory || !fs.existsSync(directory)) return [];
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...filesIn(filePath));
    else if (entry.isFile()) result.push(filePath);
  }
  return result;
}

function checksum(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function currentCommit(rootDir) {
  try {
    return execFileSync("git", ["-C", rootDir, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

function createReleaseManifest({ rootDir, scanDirectories = [] } = {}) {
  const components = [
    ...lockfileComponents(path.join(rootDir, "package-lock.json")),
    ...lockfileComponents(path.join(rootDir, "android", "package-lock.json")),
  ];
  const seen = new Set();
  const uniqueComponents = components.filter((component) => {
    const key = `${component.name}@${component.version}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const artifacts = scanDirectories
    .flatMap(filesIn)
    .sort()
    .map((filePath) => ({
      path: path.relative(rootDir, filePath),
      bytes: fs.statSync(filePath).size,
      sha256: checksum(filePath),
    }));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    host: `${os.platform()}-${os.arch()}`,
    gitCommit: currentCommit(rootDir),
    artifacts,
    components: uniqueComponents,
  };
}

function writeReleaseEvidence({
  rootDir,
  outputDirectory,
  scanDirectories = [],
}) {
  const manifest = createReleaseManifest({ rootDir, scanDirectories });
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(outputDirectory, "release-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { mode: 0o644 },
  );
  const lines = [
    "SpartanCode third-party component inventory",
    `Release commit: ${manifest.gitCommit}`,
    "",
    "This inventory is generated from committed lockfiles. It is a release aid,",
    "not a substitute for reviewing each package's license text and obligations.",
    "",
    "Components:",
    ...manifest.components.map(
      (component) =>
        `- ${component.name}@${component.version} — ${component.license} (${component.source})`,
    ),
    "",
    "Artifacts:",
    ...manifest.artifacts.map(
      (artifact) => `- ${artifact.path} — sha256:${artifact.sha256}`,
    ),
    "",
  ];
  fs.writeFileSync(
    path.join(outputDirectory, "THIRD_PARTY_NOTICES.txt"),
    lines.join("\n"),
    {
      mode: 0o644,
    },
  );
  return manifest;
}

function parseArguments(argv) {
  const outputIndex = argv.indexOf("--output");
  const scanIndex = argv.indexOf("--scan");
  return {
    outputDirectory:
      outputIndex >= 0 && argv[outputIndex + 1]
        ? path.resolve(argv[outputIndex + 1])
        : path.resolve("dist", "release-evidence"),
    scanDirectories:
      scanIndex >= 0 && argv[scanIndex + 1]
        ? [path.resolve(argv[scanIndex + 1])]
        : fs.existsSync(path.resolve("dist"))
          ? fs
              .readdirSync(path.resolve("dist"), { withFileTypes: true })
              .filter(
                (entry) =>
                  entry.isDirectory() && entry.name.endsWith("-unpacked"),
              )
              .map((entry) => path.resolve("dist", entry.name))
          : [],
  };
}

if (require.main === module) {
  const rootDir = path.resolve(__dirname, "..");
  const manifest = writeReleaseEvidence({
    rootDir,
    ...parseArguments(process.argv.slice(2)),
  });
  console.log(`release evidence written for ${manifest.gitCommit}`);
}

module.exports = {
  createReleaseManifest,
  lockfileComponents,
  writeReleaseEvidence,
};
