const crypto = require("node:crypto");

const MEMORY_KEY = "SPARTANCODE_LOCAL_MEMORY";
const DIMENSIONS = 128;
const MAX_ENTRIES = 100;
const MAX_CONTENT = 4000;
const MAX_BYTES = 220 * 1024;
const SECRET_PATTERN =
  /(api[_ -]?key|access[_ -]?token|secret|password|private[_ -]?key|BEGIN [A-Z ]+PRIVATE KEY)/i;

function vectorize(text) {
  const vector = Array(DIMENSIONS).fill(0);
  const tokens =
    String(text)
      .toLowerCase()
      .match(/[a-z0-9][a-z0-9_-]{1,48}/g) || [];
  for (const token of tokens) {
    const digest = crypto.createHash("sha256").update(token).digest();
    const index = digest.readUInt32BE(0) % DIMENSIONS;
    vector[index] += digest[4] % 2 ? 1 : -1;
  }
  const magnitude = Math.hypot(...vector) || 1;
  return vector.map((value) => value / magnitude);
}

function similarity(left, right) {
  return left.reduce((total, value, index) => total + value * right[index], 0);
}

function validateMemory(input) {
  if (!input || typeof input !== "object")
    throw new Error("Memory entry is required");
  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (!content || content.length > MAX_CONTENT)
    throw new Error(
      `Memory content is required and limited to ${MAX_CONTENT} characters`,
    );
  if (SECRET_PATTERN.test(content))
    throw new Error(
      "Secret-like content is not eligible for local memory indexing",
    );
  const tags = Array.isArray(input.tags)
    ? input.tags
        .filter((tag) => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];
  const source =
    typeof input.source === "string"
      ? input.source.trim().slice(0, 128)
      : "user";
  return { content, tags, source: source || "user" };
}

function createMemoryStore({ secureVault }) {
  if (!secureVault)
    throw new Error("Encrypted memory requires the secure vault");
  const status = () => {
    const vaultStatus = secureVault.status();
    let entries = 0;
    if (vaultStatus.available) {
      try {
        entries = read().length;
      } catch {
        entries = 0;
      }
    }
    return {
      enabled: Boolean(vaultStatus.available),
      encrypted: Boolean(vaultStatus.available),
      provider: vaultStatus.provider,
      entries,
      dimensions: DIMENSIONS,
    };
  };
  const read = () => {
    if (!secureVault.status().available)
      throw new Error(
        "OS-backed secure storage is unavailable; memory is disabled",
      );
    const raw = secureVault.get(MEMORY_KEY);
    if (!raw) return [];
    let entries;
    try {
      entries = JSON.parse(raw);
    } catch {
      throw new Error("Encrypted local memory is corrupted");
    }
    if (!Array.isArray(entries))
      throw new Error("Encrypted local memory format is invalid");
    return entries;
  };
  const write = (entries) => {
    const serialized = JSON.stringify(entries.slice(0, MAX_ENTRIES));
    if (Buffer.byteLength(serialized, "utf8") > MAX_BYTES)
      throw new Error("Encrypted local memory has reached its storage limit");
    secureVault.set(MEMORY_KEY, serialized);
  };
  return {
    status,
    add(input) {
      const memory = validateMemory(input);
      const entries = read();
      const entry = {
        id: `memory-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
        ...memory,
        vector: vectorize(`${memory.content} ${memory.tags.join(" ")}`),
        createdAt: new Date().toISOString(),
      };
      write([entry, ...entries]);
      return { ...entry, vector: undefined };
    },
    list() {
      return read().map(({ vector, ...entry }) => entry);
    },
    search(query, limit = 8) {
      const text = typeof query === "string" ? query.trim() : "";
      if (!text || text.length > MAX_CONTENT)
        throw new Error("Memory search text is invalid");
      const boundedLimit = Number.isInteger(limit)
        ? Math.min(Math.max(limit, 1), 20)
        : 8;
      const queryVector = vectorize(text);
      return read()
        .map(({ vector, ...entry }) => ({
          ...entry,
          score: similarity(queryVector, vector),
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, boundedLimit);
    },
    delete(id) {
      const entries = read();
      const filtered = entries.filter((entry) => entry.id !== id);
      if (filtered.length === entries.length) return false;
      if (filtered.length) write(filtered);
      else secureVault.delete(MEMORY_KEY);
      return true;
    },
    clear() {
      secureVault.delete(MEMORY_KEY);
      return { cleared: true };
    },
  };
}

module.exports = {
  MEMORY_KEY,
  DIMENSIONS,
  vectorize,
  similarity,
  validateMemory,
  createMemoryStore,
};
