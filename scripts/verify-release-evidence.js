#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function fail(message) {
  throw new Error(`release evidence verification failed: ${message}`);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`cannot read JSON ${filePath}: ${error.message}`);
  }
}

function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function safeRelativePath(value, label) {
  if (typeof value !== "string" || !value || path.isAbsolute(value)) {
    fail(`${label} must be a non-empty relative path`);
  }
  const normalized = path.normalize(value);
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith(`..${path.sep}`)
  ) {
    fail(`${label} escapes the release root`);
  }
  return normalized;
}

function currentCommit(rootDir) {
  try {
    return execFileSync("git", ["-C", rootDir, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function verifyReleaseEvidence({
  rootDir,
  manifestPath = path.join(
    rootDir,
    "dist",
    "release-evidence",
    "release-manifest.json",
  ),
  requireCurrentCommit = true,
} = {}) {
  const manifest = readJson(manifestPath);
  if (manifest.schemaVersion !== 1)
    fail("unsupported or missing schemaVersion");
  if (!/^[0-9a-f]{40}$/.test(manifest.gitCommit || "")) {
    fail("gitCommit must be a full 40-character commit SHA");
  }
  if (Number.isNaN(Date.parse(manifest.generatedAt || ""))) {
    fail("generatedAt must be an ISO date");
  }
  if (!Array.isArray(manifest.artifacts)) fail("artifacts must be an array");
  if (!Array.isArray(manifest.components)) fail("components must be an array");
  if (!Array.isArray(manifest.controlEvidence)) {
    fail("controlEvidence must be an array");
  }

  const artifactPaths = new Set();
  for (const [index, artifact] of manifest.artifacts.entries()) {
    const relativePath = safeRelativePath(
      artifact.path,
      `artifacts[${index}].path`,
    );
    if (artifactPaths.has(relativePath))
      fail(`duplicate artifact path ${artifact.path}`);
    artifactPaths.add(relativePath);
    const filePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      fail(`artifact is missing: ${artifact.path}`);
    }
    const bytes = fs.statSync(filePath).size;
    if (artifact.bytes !== bytes)
      fail(`byte count mismatch for ${artifact.path}`);
    if (!/^[0-9a-f]{64}$/.test(artifact.sha256 || "")) {
      fail(`invalid sha256 for ${artifact.path}`);
    }
    if (sha256(filePath) !== artifact.sha256)
      fail(`hash mismatch for ${artifact.path}`);
  }

  for (const [index, evidence] of manifest.controlEvidence.entries()) {
    if (
      !Array.isArray(evidence.sourceFiles) ||
      evidence.sourceFiles.length === 0
    ) {
      fail(`controlEvidence[${index}] has no source files`);
    }
    for (const [sourceIndex, sourceFile] of evidence.sourceFiles.entries()) {
      const relativePath = safeRelativePath(
        sourceFile,
        `controlEvidence[${index}].sourceFiles[${sourceIndex}]`,
      );
      const filePath = path.join(rootDir, relativePath);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        fail(`control evidence source is missing: ${sourceFile}`);
      }
    }
  }

  const noticesPath = path.join(
    path.dirname(manifestPath),
    "THIRD_PARTY_NOTICES.txt",
  );
  if (!fs.existsSync(noticesPath)) fail("THIRD_PARTY_NOTICES.txt is missing");
  const notices = fs.readFileSync(noticesPath, "utf8");
  for (const component of manifest.components) {
    const marker = `${component.name}@${component.version}`;
    if (!notices.includes(marker)) fail(`notices omit ${marker}`);
  }
  for (const artifact of manifest.artifacts) {
    if (!notices.includes(`sha256:${artifact.sha256}`)) {
      fail(`notices omit hash for ${artifact.path}`);
    }
  }

  if (requireCurrentCommit) {
    const checkoutCommit = currentCommit(rootDir);
    if (!checkoutCommit) fail("cannot determine current checkout commit");
    if (checkoutCommit !== manifest.gitCommit) {
      fail(
        `manifest commit ${manifest.gitCommit} differs from checkout ${checkoutCommit}`,
      );
    }
  }
  return {
    gitCommit: manifest.gitCommit,
    artifactCount: manifest.artifacts.length,
    componentCount: manifest.components.length,
    controlEvidenceCount: manifest.controlEvidence.length,
  };
}

function parseArguments(argv) {
  const manifestIndex = argv.indexOf("--manifest");
  const manifestPath =
    manifestIndex >= 0 && argv[manifestIndex + 1]
      ? path.resolve(argv[manifestIndex + 1])
      : path.resolve("dist", "release-evidence", "release-manifest.json");
  const rootIndex = argv.indexOf("--root");
  return {
    manifestPath,
    rootDir:
      rootIndex >= 0 && argv[rootIndex + 1]
        ? path.resolve(argv[rootIndex + 1])
        : path.resolve(__dirname, ".."),
  };
}

if (require.main === module) {
  try {
    const result = verifyReleaseEvidence(parseArguments(process.argv.slice(2)));
    console.log(
      `release evidence verified for ${result.gitCommit} ` +
        `(${result.artifactCount} artifacts, ${result.componentCount} components)`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { verifyReleaseEvidence };
