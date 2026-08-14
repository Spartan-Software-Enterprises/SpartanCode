const crypto = require("node:crypto");
const fs = require("node:fs");

const MAX_MODEL_BYTES = 2 * 1024 * 1024 * 1024;

function assertDigest(expectedSha256) {
  if (
    typeof expectedSha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(expectedSha256)
  )
    throw new Error(
      "Expected SHA-256 must be 64 lowercase hexadecimal characters",
    );
}

async function downloadVerifiedModel({
  url,
  expectedSha256,
  partialPath,
  finalPath,
  transport = fetch,
}) {
  if (typeof url !== "string" || new URL(url).protocol !== "https:")
    throw new Error("Model downloads require HTTPS");
  assertDigest(expectedSha256);
  if (typeof partialPath !== "string" || typeof finalPath !== "string")
    throw new Error("Model download paths are required");
  fs.mkdirSync(require("node:path").dirname(partialPath), { recursive: true });
  const partialBytes = fs.existsSync(partialPath)
    ? fs.statSync(partialPath).size
    : 0;
  if (partialBytes > MAX_MODEL_BYTES)
    throw new Error("Model partial exceeds the size limit");
  const headers = partialBytes ? { Range: `bytes=${partialBytes}-` } : {};
  let response;
  try {
    response = await transport(url, { headers });
    if (!response || ![200, 206].includes(response.status))
      throw new Error(
        `Model download failed (${response?.status || "no response"})`,
      );
    const bytes = Buffer.from(await response.arrayBuffer());
    const usePartial = partialBytes > 0 && response.status === 206;
    const combined = usePartial
      ? Buffer.concat([fs.readFileSync(partialPath), bytes])
      : bytes;
    if (combined.length > MAX_MODEL_BYTES)
      throw new Error("Model download exceeds the size limit");
    fs.writeFileSync(partialPath, combined, { mode: 0o600 });
    const digest = crypto.createHash("sha256").update(combined).digest("hex");
    if (digest !== expectedSha256) {
      fs.rmSync(partialPath, { force: true });
      throw new Error("Model checksum verification failed");
    }
    fs.renameSync(partialPath, finalPath);
    return {
      artifactPath: finalPath,
      bytes: combined.length,
      sha256: digest,
      resumed: usePartial,
    };
  } catch (error) {
    if (error.message !== "Model checksum verification failed") throw error;
    throw error;
  }
}

module.exports = { MAX_MODEL_BYTES, downloadVerifiedModel };
