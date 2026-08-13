const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const {
  canonicalize,
  fetchMarketplaceIndex,
  validateMarketplaceIndex,
  verifyMarketplaceIndex,
} = require("./plugin-marketplace");

function signedIndex(privateKey) {
  const index = {
    schemaVersion: 1,
    issuer: "SpartanCode community",
    plugins: [
      {
        id: "review-persona",
        name: "Review persona",
        version: "1.0.0",
        description: "Adds a bounded review persona.",
        license: "MIT",
        capabilities: ["persona"],
        publisher: "Spartan Software",
        sourceUrl: "https://plugins.example/review-persona.tgz",
        artifactSha256: "A".repeat(64),
      },
    ],
  };
  index.signature = crypto
    .sign(null, Buffer.from(canonicalize(index)), privateKey)
    .toString("base64url");
  return index;
}

test("marketplace indexes require HTTPS, bounded metadata, and valid licenses", () => {
  assert.throws(
    () =>
      validateMarketplaceIndex({
        schemaVersion: 1,
        issuer: "publisher",
        plugins: [
          {
            id: "unsafe",
            name: "Unsafe",
            version: "1.0.0",
            description: "x",
            license: "MIT",
            capabilities: ["template"],
            sourceUrl: "http://plugins.example/unsafe.tgz",
            artifactSha256: "a".repeat(64),
          },
        ],
      }),
    /HTTPS/,
  );
});

test("marketplace indexes verify an Ed25519 signature and preserve metadata only", async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const index = signedIndex(privateKey);
  const verified = verifyMarketplaceIndex(index, publicKey);
  assert.equal(verified.plugins[0].source, "marketplace");
  assert.equal(verified.plugins[0].artifactSha256, "a".repeat(64));
  assert.equal("signature" in verified, false);
  const fetched = await fetchMarketplaceIndex(
    "https://plugins.example/index.json",
    {
      publicKey,
      fetchImpl: async (url) => {
        assert.equal(url, "https://plugins.example/index.json");
        return { ok: true, text: async () => JSON.stringify(index) };
      },
    },
  );
  assert.equal(fetched.plugins[0].id, "review-persona");
});

test("marketplace rejects tampering, non-HTTPS fetches, and oversized indexes", async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const index = signedIndex(privateKey);
  index.plugins[0].description = "tampered";
  assert.throws(
    () => verifyMarketplaceIndex(index, publicKey),
    /verification failed/,
  );
  await assert.rejects(
    fetchMarketplaceIndex("http://plugins.example/index.json", { publicKey }),
    /HTTPS/,
  );
  await assert.rejects(
    fetchMarketplaceIndex("https://plugins.example/index.json", {
      publicKey,
      fetchImpl: async () => ({
        ok: true,
        text: async () => "x".repeat(1024 * 1024 + 1),
      }),
    }),
    /too large/,
  );
});
