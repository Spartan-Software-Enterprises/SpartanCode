const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");

const MAX_BACKUP_BYTES = 64 * 1024 * 1024;
const MAX_REMOTE_PATH = 512;
const BACKUP_KEY_NAME = "PROTON_DRIVE_BACKUP_KEY";
const REMOTE_PATH_PATTERN = /^\/[A-Za-z0-9._/-]+$/;

function validateRemotePath(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_REMOTE_PATH ||
    !REMOTE_PATH_PATTERN.test(value) ||
    value.split("/").includes("..")
  )
    throw new Error("Proton Drive remote path is invalid");
  return value;
}

function validateLocalFile(filePath) {
  if (typeof filePath !== "string" || !path.isAbsolute(filePath))
    throw new Error("Proton Drive source must be an absolute file path");
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) throw new Error("Proton Drive source must be a file");
  if (stats.size > MAX_BACKUP_BYTES)
    throw new Error("Proton Drive backup exceeds the size limit");
  return stats;
}

function readBackupKey(secureVault) {
  if (!secureVault)
    throw new Error("Secure vault is required for Proton Drive backups");
  let encoded = secureVault.get(BACKUP_KEY_NAME);
  if (!encoded) {
    encoded = crypto.randomBytes(32).toString("base64url");
    secureVault.set(BACKUP_KEY_NAME, encoded);
  }
  const key = Buffer.from(encoded, "base64url");
  if (key.length !== 32) throw new Error("Proton Drive backup key is invalid");
  return key;
}

function encryptBackup(bytes, remotePath, secureVault) {
  if (!Buffer.isBuffer(bytes) || bytes.length > MAX_BACKUP_BYTES)
    throw new Error("Proton Drive backup content is invalid or too large");
  const safeRemotePath = validateRemotePath(remotePath);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    readBackupKey(secureVault),
    iv,
  );
  cipher.setAAD(Buffer.from(safeRemotePath, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.from(
    JSON.stringify({
      schemaVersion: 1,
      algorithm: "AES-256-GCM",
      remotePath: safeRemotePath,
      iv: iv.toString("base64url"),
      tag: cipher.getAuthTag().toString("base64url"),
      ciphertext: ciphertext.toString("base64url"),
    }) + "\n",
  );
}

function createProtonDriveStorage({
  environment = process.env,
  secureVault,
  execFileImpl = execFile,
} = {}) {
  const binary = () =>
    String(
      environment.SPARTANCODE_PROTON_DRIVE_CLI ||
        environment.PROTON_DRIVE_CLI ||
        "proton-drive",
    ).trim();

  function run(args) {
    return new Promise((resolve, reject) => {
      execFileImpl(
        binary(),
        args,
        { shell: false, timeout: 120_000, maxBuffer: 2 * 1024 * 1024 },
        (error, stdout = "", stderr = "") => {
          if (error) {
            const detail = String(stderr || error.message).slice(0, 2_000);
            reject(new Error(`Proton Drive CLI failed: ${detail}`));
            return;
          }
          resolve(String(stdout).slice(0, 2 * 1024 * 1024));
        },
      );
    });
  }

  return {
    status() {
      const configured = Boolean(
        environment.PROTON_DRIVE_CLI ||
        environment.SPARTANCODE_PROTON_DRIVE_CLI,
      );
      return {
        provider: "Proton Drive",
        configured,
        authenticated: "unknown",
        available: configured,
        message: configured
          ? "Official Proton Drive CLI configured; sign in with `proton-drive auth login`"
          : "Install the official Proton Drive CLI and configure its path",
        cli: configured ? binary() : null,
        encryption: "SpartanCode AES-256-GCM envelope + Proton Drive E2EE",
      };
    },
    async version() {
      const output = await run(["version"]);
      return { ok: true, output: output.trim().slice(0, 512) };
    },
    async backupFile(sourcePath, remoteParent) {
      validateLocalFile(sourcePath);
      const remoteName = `${path.basename(sourcePath)}.spartancode.enc`;
      return this.backupBytes(
        fs.readFileSync(sourcePath),
        remoteParent,
        remoteName,
      );
    },
    async backupBytes(
      bytes,
      remoteParent,
      fileName = "workspace.spartancode.enc",
    ) {
      const safeParent = validateRemotePath(remoteParent);
      if (!/^[A-Za-z0-9._-]+$/.test(fileName))
        throw new Error("Proton Drive backup filename is invalid");
      const remotePath = `${safeParent.replace(/\/$/, "")}/${fileName}`;
      const encrypted = encryptBackup(bytes, remotePath, secureVault);
      const temporaryDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "spartancode-proton-drive-"),
      );
      const temporaryPath = path.join(temporaryDir, fileName);
      try {
        fs.writeFileSync(temporaryPath, encrypted, { mode: 0o600 });
        const output = await run([
          "filesystem",
          "upload",
          temporaryPath,
          safeParent,
          "--json",
          "--skip-thumbnails",
        ]);
        return {
          ok: true,
          remotePath,
          bytes: encrypted.length,
          output: output.trim().slice(0, 2_000),
        };
      } finally {
        fs.rmSync(temporaryDir, { recursive: true, force: true });
      }
    },
  };
}

module.exports = {
  BACKUP_KEY_NAME,
  MAX_BACKUP_BYTES,
  encryptBackup,
  validateRemotePath,
  createProtonDriveStorage,
};
