const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSecureVault } = require("./secure-vault");

function fakeSafeStorage() {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(value, "utf8").toString("base64url"),
    decryptString: (value) => Buffer.from(value, "base64url").toString("utf8"),
  };
}

test("secure vault persists encrypted AES-GCM records without plaintext", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-vault-"));
  const filePath = path.join(dir, "secrets.json");
  const vault = createSecureVault({ safeStorage: fakeSafeStorage(), filePath });
  vault.set("github.token", "do-not-leak");
  assert.equal(vault.get("github.token"), "do-not-leak");
  assert.equal(
    fs.readFileSync(filePath, "utf8").includes("do-not-leak"),
    false,
  );
  assert.deepEqual(
    vault.list().map((item) => item.name),
    ["github.token"],
  );
  assert.equal(vault.delete("github.token"), true);
  assert.equal(fs.existsSync(filePath), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("secure vault refuses plaintext fallback", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-vault-off-"));
  const vault = createSecureVault({
    safeStorage: { isEncryptionAvailable: () => false },
    filePath: path.join(dir, "secrets.json"),
  });
  assert.equal(vault.status().fallback, false);
  assert.throws(() => vault.set("token", "value"), /plaintext fallback/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("secure vault detects tampering", () => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-vault-tamper-"),
  );
  const filePath = path.join(dir, "secrets.json");
  const vault = createSecureVault({ safeStorage: fakeSafeStorage(), filePath });
  vault.set("token", crypto.randomBytes(8).toString("hex"));
  const document = JSON.parse(fs.readFileSync(filePath, "utf8"));
  document.records.token.ciphertext = "tampered";
  fs.writeFileSync(filePath, JSON.stringify(document));
  assert.throws(() => vault.get("token"), /cannot be unlocked/);
  fs.rmSync(dir, { recursive: true, force: true });
});
