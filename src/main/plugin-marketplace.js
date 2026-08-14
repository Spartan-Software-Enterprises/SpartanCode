const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { validatePlugin } = require("./plugin-registry");

const MAX_INDEX_BYTES = 1024 * 1024;
const MAX_ENTRIES = 100;
const MAX_ARTIFACT_BYTES = 50 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;
const SHA256 = /^[a-f0-9]{64}$/i;
const ENTRYPOINT = /^[A-Za-z0-9._-]{1,96}$/;

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function decodeSignature(signature) {
  if (typeof signature !== "string" || !signature)
    throw new Error("Marketplace signature is required");
  const decoded = Buffer.from(signature, "base64url");
  if (!decoded.length || decoded.length > 256)
    throw new Error("Marketplace signature is invalid");
  return decoded;
}

function validateMarketplaceIndex(index) {
  if (!index || typeof index !== "object")
    throw new Error("Marketplace index must be an object");
  if (index.schemaVersion !== 1)
    throw new Error("Unsupported marketplace index schema");
  if (typeof index.issuer !== "string" || !index.issuer.trim())
    throw new Error("Marketplace issuer is required");
  if (!Array.isArray(index.plugins) || index.plugins.length > MAX_ENTRIES)
    throw new Error("Marketplace plugin count is outside the allowed bound");
  const plugins = index.plugins.map((manifest) => {
    const plugin = validatePlugin(manifest, "marketplace");
    let sourceUrl;
    try {
      sourceUrl = new URL(manifest.sourceUrl);
    } catch {
      throw new Error("Marketplace plugin source must be a valid HTTPS URL");
    }
    if (sourceUrl.protocol !== "https:")
      throw new Error("Marketplace plugin source must use HTTPS");
    if (sourceUrl.username || sourceUrl.password)
      throw new Error("Marketplace plugin source must not contain credentials");
    if (!SHA256.test(manifest.artifactSha256))
      throw new Error(
        "Marketplace plugin artifactSha256 must be a SHA-256 digest",
      );
    return {
      ...plugin,
      sourceUrl: sourceUrl.toString(),
      artifactSha256: manifest.artifactSha256.toLowerCase(),
      publisher:
        typeof manifest.publisher === "string" ? manifest.publisher.trim() : "",
      runtime: manifest.runtime === "node" ? "node" : null,
      entrypoint:
        typeof manifest.entrypoint === "string" &&
        ENTRYPOINT.test(manifest.entrypoint)
          ? manifest.entrypoint
          : null,
    };
  });
  const ids = new Set();
  for (const plugin of plugins) {
    if (ids.has(plugin.id))
      throw new Error("Marketplace plugin ids must be unique");
    ids.add(plugin.id);
  }
  return {
    schemaVersion: 1,
    issuer: index.issuer.trim(),
    plugins,
  };
}

function verifyMarketplaceIndex(index, publicKey) {
  const validated = validateMarketplaceIndex(index);
  if (!publicKey) throw new Error("Marketplace verification key is required");
  const signed = { ...index };
  delete signed.signature;
  const valid = crypto.verify(
    null,
    Buffer.from(canonicalize(signed)),
    publicKey,
    decodeSignature(index.signature),
  );
  if (!valid) throw new Error("Marketplace signature verification failed");
  return validated;
}

function marketplaceEntryKey(manifest) {
  return [
    manifest.id,
    manifest.version,
    manifest.sourceUrl,
    manifest.artifactSha256,
  ].join("|");
}

function createMarketplaceTrustRegistry() {
  const entries = new Map();
  return {
    remember(index) {
      if (!index || !Array.isArray(index.plugins))
        throw new Error("A verified marketplace index is required");
      for (const plugin of index.plugins) {
        entries.set(marketplaceEntryKey(plugin), canonicalize(plugin));
      }
      return index;
    },
    resolve(manifest) {
      const validated = validateMarketplaceIndex({
        schemaVersion: 1,
        issuer: "ipc-entry",
        plugins: [manifest],
      }).plugins[0];
      const trusted = entries.get(marketplaceEntryKey(validated));
      if (!trusted || trusted !== canonicalize(validated))
        throw new Error(
          "Marketplace plugin must come from a previously verified index",
        );
      return validated;
    },
    clear() {
      entries.clear();
    },
  };
}

async function fetchMarketplaceIndex(
  url,
  { fetchImpl = globalThis.fetch, publicKey } = {},
) {
  let target;
  try {
    target = new URL(url);
  } catch {
    throw new Error("Marketplace URL is invalid");
  }
  if (target.protocol !== "https:")
    throw new Error("Marketplace URL must use HTTPS");
  if (typeof fetchImpl !== "function")
    throw new Error("Marketplace fetch is unavailable");
  const response = await fetchImpl(target.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!response?.ok)
    throw new Error(
      `Marketplace request failed (${response?.status || "unknown"})`,
    );
  const raw = await response.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_INDEX_BYTES)
    throw new Error("Marketplace index is too large");
  let index;
  try {
    index = JSON.parse(raw);
  } catch {
    throw new Error("Marketplace index is not valid JSON");
  }
  return verifyMarketplaceIndex(index, publicKey);
}

async function downloadMarketplaceArtifact(
  manifest,
  { destinationDir, fetchImpl = globalThis.fetch } = {},
) {
  if (typeof destinationDir !== "string" || !path.isAbsolute(destinationDir))
    throw new Error("Marketplace artifact destination must be absolute");
  const validated = validateMarketplaceIndex({
    schemaVersion: 1,
    issuer: "artifact-download",
    plugins: [manifest],
  }).plugins[0];
  if (typeof fetchImpl !== "function")
    throw new Error("Marketplace fetch is unavailable");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response;
  try {
    response = await fetchImpl(validated.sourceUrl, {
      headers: { Accept: "application/octet-stream, application/gzip" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response?.ok)
    throw new Error(
      `Marketplace artifact request failed (${response?.status || "unknown"})`,
    );
  const declaredLength = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_ARTIFACT_BYTES)
    throw new Error("Marketplace artifact is too large");
  if (typeof response.arrayBuffer !== "function")
    throw new Error("Marketplace artifact response is not readable");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_ARTIFACT_BYTES)
    throw new Error("Marketplace artifact is too large");
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  if (digest !== validated.artifactSha256)
    throw new Error("Marketplace artifact SHA-256 verification failed");

  const artifactDir = path.join(
    destinationDir,
    validated.id,
    validated.version,
  );
  fs.mkdirSync(artifactDir, { recursive: true, mode: 0o700 });
  const artifactPath = path.join(artifactDir, "artifact.bin");
  const metadataPath = path.join(artifactDir, "metadata.json");
  const temporaryPath = `${artifactPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, bytes, { mode: 0o600 });
  fs.renameSync(temporaryPath, artifactPath);
  const metadata = {
    id: validated.id,
    version: validated.version,
    sourceUrl: validated.sourceUrl,
    artifactSha256: digest,
    downloadedAt: new Date().toISOString(),
    installState: "staged",
  };
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, {
    mode: 0o600,
  });
  return { ...metadata, artifactPath, metadataPath };
}

function activateMarketplacePlugin(
  manifest,
  { stagingDir, workspacePath, now = new Date().toISOString() } = {},
) {
  if (typeof stagingDir !== "string" || !path.isAbsolute(stagingDir))
    throw new Error("Marketplace staging directory must be absolute");
  if (typeof workspacePath !== "string" || !path.isAbsolute(workspacePath))
    throw new Error("A workspace is required to activate a plugin");
  const validated = validateMarketplaceIndex({
    schemaVersion: 1,
    issuer: "artifact-activation",
    plugins: [manifest],
  }).plugins[0];
  const stagedDir = path.join(stagingDir, validated.id, validated.version);
  const artifactPath = path.join(stagedDir, "artifact.bin");
  const metadataPath = path.join(stagedDir, "metadata.json");
  if (!fs.existsSync(artifactPath) || !fs.existsSync(metadataPath))
    throw new Error("A verified staged artifact is required");
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  if (
    metadata.installState !== "staged" ||
    metadata.artifactSha256 !== validated.artifactSha256
  )
    throw new Error("Staged artifact metadata is invalid");
  const digest = crypto
    .createHash("sha256")
    .update(fs.readFileSync(artifactPath))
    .digest("hex");
  if (digest !== validated.artifactSha256)
    throw new Error("Staged artifact integrity verification failed");

  // Activation installs only the validated declarative manifest. The staged
  // artifact remains opaque and is never extracted, loaded, or executed.
  const pluginDir = path.join(workspacePath, ".spartancode", "plugins");
  fs.mkdirSync(pluginDir, { recursive: true, mode: 0o700 });
  const targetPath = path.join(pluginDir, `${validated.id}.json`);
  const temporaryPath = `${targetPath}.${process.pid}.tmp`;
  const activeManifest = {
    id: validated.id,
    name: validated.name,
    version: validated.version,
    description: validated.description,
    license: validated.license,
    capabilities: validated.capabilities,
    source: "marketplace",
    publisher: validated.publisher,
    runtime: validated.runtime,
    entrypoint: validated.entrypoint,
    artifactSha256: validated.artifactSha256,
    activatedAt: now,
  };
  fs.writeFileSync(
    temporaryPath,
    `${JSON.stringify(activeManifest, null, 2)}\n`,
    {
      mode: 0o600,
    },
  );
  fs.renameSync(temporaryPath, targetPath);
  fs.writeFileSync(
    metadataPath,
    `${JSON.stringify({ ...metadata, installState: "active", activatedAt: now }, null, 2)}\n`,
    { mode: 0o600 },
  );
  return { ...activeManifest, manifestPath: targetPath, metadataPath };
}

function deactivateMarketplacePlugin(manifest, { workspacePath } = {}) {
  if (typeof workspacePath !== "string" || !path.isAbsolute(workspacePath))
    throw new Error("A workspace is required to deactivate a plugin");
  const validated = validateMarketplaceIndex({
    schemaVersion: 1,
    issuer: "artifact-deactivation",
    plugins: [manifest],
  }).plugins[0];
  const pluginRoot = path.join(workspacePath, ".spartancode", "plugins");
  const manifestPath = path.join(pluginRoot, `${validated.id}.json`);
  if (!fs.existsSync(manifestPath))
    throw new Error("Marketplace plugin is not active");
  const installed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (
    installed.source !== "marketplace" ||
    installed.id !== validated.id ||
    installed.artifactSha256 !== validated.artifactSha256
  )
    throw new Error(
      "Active plugin metadata does not match the verified manifest",
    );
  fs.unlinkSync(manifestPath);
  return {
    id: validated.id,
    version: validated.version,
    manifestPath,
    installState: "staged",
  };
}

module.exports = {
  MAX_ENTRIES,
  MAX_ARTIFACT_BYTES,
  canonicalize,
  createMarketplaceTrustRegistry,
  downloadMarketplaceArtifact,
  activateMarketplacePlugin,
  deactivateMarketplacePlugin,
  fetchMarketplaceIndex,
  validateMarketplaceIndex,
  verifyMarketplaceIndex,
};
