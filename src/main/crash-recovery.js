const fs = require("fs");
const path = require("path");

const MAX_RECORDS = 20;
const MAX_TEXT = 2000;

function redact(value) {
  return String(value ?? "")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(
      /((?:api[_-]?key|token|password|secret|private[_-]?key|authorization)\s*[:=]\s*)[^\s,;]+/gi,
      "$1[redacted]",
    )
    .slice(0, MAX_TEXT);
}

function createCrashReporter(filePath, dependencies = {}) {
  const fileSystem = dependencies.fs || fs;
  const pathModule = dependencies.path || path;

  const read = () => {
    try {
      const parsed = JSON.parse(fileSystem.readFileSync(filePath, "utf8"));
      return Array.isArray(parsed) ? parsed.slice(0, MAX_RECORDS) : [];
    } catch (error) {
      if (error.code === "ENOENT") return [];
      return [];
    }
  };

  const record = (type, details = {}) => {
    const entry = {
      type: redact(type),
      reason: redact(details.reason),
      exitCode:
        Number.isInteger(details.exitCode) && details.exitCode >= 0
          ? details.exitCode
          : null,
      message: redact(details.message || details.error),
      stack: redact(details.stack),
      timestamp: new Date().toISOString(),
    };
    try {
      fileSystem.mkdirSync(pathModule.dirname(filePath), { recursive: true });
      const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
      fileSystem.writeFileSync(
        temporaryPath,
        JSON.stringify([entry, ...read()].slice(0, MAX_RECORDS), null, 2),
      );
      fileSystem.renameSync(temporaryPath, filePath);
      return true;
    } catch {
      return false;
    }
  };

  return { read, record };
}

module.exports = { createCrashReporter, redact };
