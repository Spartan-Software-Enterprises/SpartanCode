const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  buildSignedMarketplaceIndex,
  generatePublisherKeyPair,
  writeSignedMarketplaceIndex,
} = require("./marketplace-publisher");
const { verifyMarketplaceIndex } = require("../src/main/plugin-marketplace");

const manifest = {
  id: "sample-template",
  name: "Sample template",
  version: "1.0.0",
  description: "A sample community template.",
  license: "MIT",
  capabilities: ["template"],
  sourceUrl: "https://example.com/sample-template.bin",
  artifactSha256: "a".repeat(64),
  publisher: "Example publisher",
};

test("publisher creates an Ed25519 index accepted by the desktop verifier", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-publisher-"));
  const keys = generatePublisherKeyPair(path.join(root, "keys"));
  const index = buildSignedMarketplaceIndex({
    issuer: "Example publisher registry",
    manifests: [manifest],
    privateKey: fs.readFileSync(keys.privatePath, "utf8"),
  });
  const verified = verifyMarketplaceIndex(
    index,
    fs.readFileSync(keys.publicPath, "utf8"),
  );
  assert.equal(verified.plugins[0].id, manifest.id);
  assert.match(index.signature, /^[A-Za-z0-9_-]+$/);
  fs.rmSync(root, { recursive: true, force: true });
});

test("publisher refuses to overwrite keys or an index", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-publisher-"));
  const keys = generatePublisherKeyPair(path.join(root, "keys"));
  assert.throws(
    () => generatePublisherKeyPair(path.join(root, "keys")),
    /overwrite/,
  );
  const index = buildSignedMarketplaceIndex({
    issuer: "Example",
    manifests: [manifest],
    privateKey: fs.readFileSync(keys.privatePath, "utf8"),
  });
  const output = path.join(root, "index.json");
  writeSignedMarketplaceIndex(index, output);
  assert.throws(() => writeSignedMarketplaceIndex(index, output), /overwrite/);
  fs.rmSync(root, { recursive: true, force: true });
});

test("publisher signing is deterministic for the same unsigned catalog", () => {
  const { privateKey } = crypto.generateKeyPairSync("ed25519");
  const first = buildSignedMarketplaceIndex({
    issuer: "Example",
    manifests: [manifest],
    privateKey,
  });
  const second = buildSignedMarketplaceIndex({
    issuer: "Example",
    manifests: [manifest],
    privateKey,
  });
  assert.equal(first.signature, second.signature);
});
