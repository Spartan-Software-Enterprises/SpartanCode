const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const VERSION = 1;
const MAX_NAME = 128;
const MAX_VALUE_BYTES = 256 * 1024;
const NAME_PATTERN = /^[A-Za-z0-9_.:-]+$/;

function validateName(name) {
  if (typeof name !== "string" || name.length === 0 || name.length > MAX_NAME)
    throw new Error("Secure key name is invalid");
  if (!NAME_PATTERN.test(name)) throw new Error("Secure key name is invalid");
  return name;
}

function createSecureVault({ safeStorage, filePath }) {
  if (
    !safeStorage ||
    typeof filePath !== "string" ||
    !path.isAbsolute(filePath)
  )
    throw new Error("Secure vault requires OS storage and an absolute path");

  const status = () => ({
    available: safeStorage.isEncryptionAvailable(),
    provider: "OS-backed keychain + AES-256-GCM",
    persistent: true,
    fallback: false,
  });

  function assertAvailable() {
    if (!status().available)
      throw new Error(
        "OS-backed secure storage is unavailable; plaintext fallback is disabled",
      );
  }

  function load() {
    if (!fs.existsSync(filePath))
      return { version: VERSION, wrappedKey: null, records: {} };
    let document;
    try {
      document = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      throw new Error(
        "Secure vault is corrupted and must be recovered before use",
      );
    }
    if (document?.version !== VERSION || typeof document.records !== "object")
      throw new Error("Unsupported secure vault format");
    return document;
  }

  function dataKey(document, create = false) {
    assertAvailable();
    if (!document.wrappedKey && create) {
      const key = crypto.randomBytes(32);
      document.wrappedKey = safeStorage
        .encryptString(key.toString("base64"))
        .toString("base64");
      return key;
    }
    if (typeof document.wrappedKey !== "string")
      throw new Error("Secure vault key is missing");
    try {
      const key = Buffer.from(
        safeStorage.decryptString(Buffer.from(document.wrappedKey, "base64")),
        "base64",
      );
      if (key.length !== 32) throw new Error("invalid key length");
      return key;
    } catch {
      throw new Error("Secure vault key cannot be unlocked");
    }
  }

  function encrypt(key, name, value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(name));
    const ciphertext = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    return {
      iv: iv.toString("base64url"),
      tag: cipher.getAuthTag().toString("base64url"),
      ciphertext: ciphertext.toString("base64url"),
      updatedAt: new Date().toISOString(),
    };
  }

  function decrypt(key, name, record) {
    try {
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(record.iv, "base64url"),
      );
      decipher.setAAD(Buffer.from(name));
      decipher.setAuthTag(Buffer.from(record.tag, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(record.ciphertext, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new Error("Secure vault record cannot be unlocked");
    }
  }

  function persist(document) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(document)}\n`, {
      mode: 0o600,
    });
    fs.renameSync(temporaryPath, filePath);
    try {
      fs.chmodSync(filePath, 0o600);
    } catch {
      /* best effort on Windows */
    }
  }

  return {
    status,
    list() {
      const document = load();
      return Object.entries(document.records)
        .map(([name, record]) => ({
          name,
          updatedAt: record.updatedAt,
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
    },
    get(name) {
      const safeName = validateName(name);
      const document = load();
      const record = document.records[safeName];
      return record ? decrypt(dataKey(document), safeName, record) : null;
    },
    set(name, value) {
      const safeName = validateName(name);
      if (
        typeof value !== "string" ||
        Buffer.byteLength(value, "utf8") > MAX_VALUE_BYTES
      )
        throw new Error("Secure key value is invalid or too large");
      const document = load();
      document.records[safeName] = encrypt(
        dataKey(document, true),
        safeName,
        value,
      );
      persist(document);
      return {
        name: safeName,
        updatedAt: document.records[safeName].updatedAt,
      };
    },
    delete(name) {
      const safeName = validateName(name);
      const document = load();
      const existed = Boolean(document.records[safeName]);
      delete document.records[safeName];
      if (Object.keys(document.records).length === 0) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      } else if (existed) persist(document);
      return existed;
    },
  };
}

module.exports = { MAX_VALUE_BYTES, createSecureVault, validateName };
