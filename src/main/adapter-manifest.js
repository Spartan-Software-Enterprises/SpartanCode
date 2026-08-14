const ADAPTER_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;
const STATUS = new Set([
  "available",
  "unavailable",
  "blocked",
  "unsupported",
  "requires_authorized_access",
]);
const KINDS = new Set([
  "engine",
  "dcc",
  "middleware",
  "build",
  "connector",
  "plugin",
  "runtime",
]);
const MAX_ITEMS = 64;

function boundedString(value, label, { pattern = null, max = 128 } = {}) {
  if (typeof value !== "string" || value.length === 0 || value.length > max)
    throw new Error(`${label} must be a bounded non-empty string`);
  if (pattern && !pattern.test(value)) throw new Error(`${label} is invalid`);
  return value;
}

function boundedList(value, label, { itemPattern = null } = {}) {
  if (!Array.isArray(value) || value.length > MAX_ITEMS)
    throw new Error(`${label} must be a bounded array`);
  const result = value.map((item, index) =>
    boundedString(item, `${label}[${index}]`, { pattern: itemPattern }),
  );
  if (new Set(result).size !== result.length)
    throw new Error(`${label} must not contain duplicates`);
  return result;
}

function boundedMap(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  const entries = Object.entries(value);
  if (entries.length > MAX_ITEMS) throw new Error(`${label} is too large`);
  return Object.fromEntries(
    entries.map(([key, item]) => [
      boundedString(key, `${label} key`, { pattern: ADAPTER_ID }),
      boundedString(item, `${label}.${key}`),
    ]),
  );
}

function normalizeAdapterManifest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Adapter manifest must be an object");
  if (input.schemaVersion !== 1)
    throw new Error("Unsupported adapter manifest schema");
  const id = boundedString(input.id, "Adapter id", { pattern: ADAPTER_ID });
  const kind = boundedString(input.kind, "Adapter kind");
  if (!KINDS.has(kind)) throw new Error("Adapter kind is unsupported");
  const name = boundedString(input.name, "Adapter name");
  const adapterVersion = boundedString(
    input.adapterVersion,
    "Adapter version",
    {
      pattern: VERSION,
    },
  );
  const status = boundedString(input.status, "Adapter status");
  if (!STATUS.has(status)) throw new Error("Adapter status is unsupported");
  const descriptor = {
    schemaVersion: 1,
    id,
    kind,
    name,
    adapterVersion,
    status,
    hosts: boundedList(input.hosts || "", "Adapter hosts"),
    targets: boundedMap(input.targets || {}, "Adapter targets"),
    operations: boundedList(input.operations || [], "Adapter operations", {
      itemPattern: ADAPTER_ID,
    }),
    requirements: boundedList(input.requirements || [], "Adapter requirements"),
    permissions: boundedList(input.permissions || [], "Adapter permissions"),
    execution: {
      mode: boundedString(
        input.execution?.mode || "declarative",
        "Execution mode",
      ),
      shell: input.execution?.shell === true,
      network: input.execution?.network === true,
      credentials: input.execution?.credentials === true,
    },
    provenance: {
      source: boundedString(
        input.provenance?.source || "bundled",
        "Provenance source",
      ),
      sourceRevision: input.provenance?.sourceRevision
        ? boundedString(input.provenance.sourceRevision, "Provenance revision")
        : null,
      license: boundedString(
        input.provenance?.license || "unknown",
        "Provenance license",
      ),
    },
    testCoverage: boundedList(
      input.testCoverage || [],
      "Adapter test coverage",
    ),
  };
  if (descriptor.execution.shell && descriptor.execution.mode === "declarative")
    throw new Error("Declarative adapters cannot request shell execution");
  if (
    descriptor.execution.credentials &&
    !descriptor.permissions.includes("secret-reference")
  )
    throw new Error(
      "Credential adapters require the secret-reference permission",
    );
  return descriptor;
}

function validateAdapterManifests(manifests) {
  if (!Array.isArray(manifests) || manifests.length > MAX_ITEMS)
    throw new Error("Adapter manifests must be a bounded array");
  const normalized = manifests.map(normalizeAdapterManifest);
  const ids = new Set();
  for (const manifest of normalized) {
    if (ids.has(manifest.id)) throw new Error("Adapter ids must be unique");
    ids.add(manifest.id);
  }
  return normalized;
}

module.exports = {
  normalizeAdapterManifest,
  validateAdapterManifests,
};
