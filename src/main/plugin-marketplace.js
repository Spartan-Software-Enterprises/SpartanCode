const crypto = require("node:crypto");
const { validatePlugin } = require("./plugin-registry");

const MAX_INDEX_BYTES = 1024 * 1024;
const MAX_ENTRIES = 100;
const SHA256 = /^[a-f0-9]{64}$/i;

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

module.exports = {
  MAX_ENTRIES,
  canonicalize,
  fetchMarketplaceIndex,
  validateMarketplaceIndex,
  verifyMarketplaceIndex,
};
