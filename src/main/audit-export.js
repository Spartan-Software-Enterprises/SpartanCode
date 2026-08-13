const crypto = require("crypto");

const MAX_EVENTS = 1000;
const SECRET_KEY = /(token|password|secret|private.?key|api.?key|credential)/i;

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      SECRET_KEY.test(key) ? "[REDACTED]" : redact(child),
    ]),
  );
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(events) {
  return crypto.createHash("sha256").update(canonical(events)).digest("hex");
}

function exportAuditLog(events, { now = new Date().toISOString() } = {}) {
  if (!Array.isArray(events)) throw new Error("Audit events must be an array");
  const safeEvents = events.slice(0, MAX_EVENTS).map((event) => redact(event));
  return {
    schemaVersion: 1,
    generatedAt: now,
    eventCount: safeEvents.length,
    events: safeEvents,
    sha256: digest(safeEvents),
  };
}

function verifyAuditExport(bundle) {
  if (
    !bundle ||
    bundle.schemaVersion !== 1 ||
    !Array.isArray(bundle.events) ||
    typeof bundle.sha256 !== "string"
  )
    return false;
  return (
    bundle.eventCount === bundle.events.length &&
    digest(bundle.events) === bundle.sha256
  );
}

module.exports = { exportAuditLog, redact, verifyAuditExport };
