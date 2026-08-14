const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  BACKUP_KEY_NAME,
  createProtonDriveStorage,
  decryptBackup,
  encryptBackup,
  validateRemotePath,
} = require("./proton-drive-storage");

function vault() {
  const values = new Map();
  return {
    get: (name) => values.get(name) || null,
    set: (name, value) => values.set(name, value),
    values,
  };
}

test("Proton Drive remote paths are bounded and traversal-safe", () => {
  assert.equal(
    validateRemotePath("/SpartanCode/backups"),
    "/SpartanCode/backups",
  );
  assert.throws(() => validateRemotePath("/SpartanCode/../private"), /invalid/);
  assert.throws(() => validateRemotePath("https://example.invalid"), /invalid/);
});

test("Proton Drive backup envelope uses the secure vault and hides plaintext", () => {
  const secureVault = vault();
  const envelope = encryptBackup(
    Buffer.from("private workspace evidence"),
    "/SpartanCode/backups/evidence.enc",
    secureVault,
  );
  assert.equal(secureVault.values.has(BACKUP_KEY_NAME), true);
  assert.equal(envelope.includes("private workspace evidence"), false);
  const parsed = JSON.parse(envelope);
  assert.equal(parsed.algorithm, "AES-256-GCM");
  assert.equal(parsed.remotePath, "/SpartanCode/backups/evidence.enc");
  assert.deepEqual(
    decryptBackup(envelope, "/SpartanCode/backups/evidence.enc", secureVault),
    Buffer.from("private workspace evidence"),
  );
  const tamperedEnvelope = JSON.parse(envelope);
  tamperedEnvelope.ciphertext = `${tamperedEnvelope.ciphertext.slice(0, -1)}${tamperedEnvelope.ciphertext.endsWith("A") ? "B" : "A"}`;
  const tampered = Buffer.from(`${JSON.stringify(tamperedEnvelope)}\n`);
  assert.throws(
    () =>
      decryptBackup(tampered, "/SpartanCode/backups/evidence.enc", secureVault),
    /integrity verification failed/,
  );
});

test("Proton Drive backup invokes the official CLI without a shell", async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-proton-"),
  );
  const sourcePath = path.join(directory, "workspace.json");
  fs.writeFileSync(sourcePath, '{"secret":"private"}\n');
  const calls = [];
  const secureVault = vault();
  const storage = createProtonDriveStorage({
    environment: { SPARTANCODE_PROTON_DRIVE_CLI: "/opt/proton-drive" },
    secureVault,
    execFileImpl: (binary, args, options, callback) => {
      calls.push({ binary, args, options });
      callback(null, '{"uploaded":true}\n', "");
    },
  });
  const result = await storage.backupFile(sourcePath, "/SpartanCode/backups");
  assert.equal(result.ok, true);
  assert.equal(calls[0].binary, "/opt/proton-drive");
  assert.deepEqual(calls[0].args.slice(0, 4), [
    "filesystem",
    "upload",
    calls[0].args[2],
    "/SpartanCode/backups",
  ]);
  assert.equal(calls[0].options.shell, false);
  assert.equal(calls[0].args.includes("--skip-thumbnails"), true);
  assert.equal(fs.readdirSync(directory).length, 1);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("Proton Drive restore verifies and writes only to a new destination", async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-proton-restore-"),
  );
  const secureVault = vault();
  const remotePath = "/SpartanCode/backups/workspace.spartancode.enc";
  const envelope = encryptBackup(
    Buffer.from('{"restored":true}\n'),
    remotePath,
    secureVault,
  );
  const destinationPath = path.join(directory, "restored.json");
  const storage = createProtonDriveStorage({
    environment: { SPARTANCODE_PROTON_DRIVE_CLI: "/opt/proton-drive" },
    secureVault,
    execFileImpl: (_binary, args, _options, callback) => {
      fs.mkdirSync(args[3], { recursive: true });
      fs.writeFileSync(path.join(args[3], path.basename(remotePath)), envelope);
      callback(null, '{"downloaded":true}\n', "");
    },
  });
  const result = await storage.restoreFile(remotePath, destinationPath);
  assert.equal(result.ok, true);
  assert.equal(fs.readFileSync(destinationPath, "utf8"), '{"restored":true}\n');
  await assert.rejects(
    storage.restoreFile(remotePath, destinationPath),
    /already exists/,
  );
  fs.rmSync(directory, { recursive: true, force: true });
});
