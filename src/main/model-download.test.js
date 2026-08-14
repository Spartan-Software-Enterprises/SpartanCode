const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { downloadVerifiedModel } = require("./model-download");

function digest(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

test("resumes partial downloads and finalizes only after checksum verification", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-download-"));
  const partialPath = path.join(root, "model.part");
  const finalPath = path.join(root, "model.gguf");
  const bytes = Buffer.from("model-bytes");
  fs.writeFileSync(partialPath, bytes.subarray(0, 5));
  let request;
  const result = await downloadVerifiedModel({
    url: "https://huggingface.co/org/model/resolve/main/model.gguf",
    expectedSha256: digest(bytes),
    partialPath,
    finalPath,
    transport: async (_url, options) => {
      request = options;
      return { status: 206, arrayBuffer: async () => bytes.subarray(5) };
    },
  });
  assert.equal(request.headers.Range, "bytes=5-");
  assert.equal(result.resumed, true);
  assert.deepEqual(fs.readFileSync(finalPath), bytes);
  assert.equal(fs.existsSync(partialPath), false);
  fs.rmSync(root, { recursive: true, force: true });
});

test("replaces a partial when the server ignores Range and rejects unsafe inputs", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-download-"));
  const partialPath = path.join(root, "model.part");
  const finalPath = path.join(root, "model.gguf");
  const bytes = Buffer.from("complete");
  fs.writeFileSync(partialPath, "old");
  const result = await downloadVerifiedModel({
    url: "https://example.test/model",
    expectedSha256: digest(bytes),
    partialPath,
    finalPath,
    transport: async () => ({ status: 200, arrayBuffer: async () => bytes }),
  });
  assert.equal(result.resumed, false);
  assert.deepEqual(fs.readFileSync(finalPath), bytes);
  await assert.rejects(
    downloadVerifiedModel({
      url: "http://example.test/model",
      expectedSha256: digest(bytes),
      partialPath,
      finalPath,
    }),
    /require HTTPS/,
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test("cleans up a checksum mismatch and rejects malformed digests before transport", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-download-"));
  const partialPath = path.join(root, "model.part");
  const finalPath = path.join(root, "model.gguf");
  let called = false;
  await assert.rejects(
    downloadVerifiedModel({
      url: "https://example.test/model",
      expectedSha256: "0".repeat(64),
      partialPath,
      finalPath,
      transport: async () => {
        called = true;
        return { status: 200, arrayBuffer: async () => Buffer.from("bad") };
      },
    }),
    /checksum/,
  );
  assert.equal(called, true);
  assert.equal(fs.existsSync(finalPath), false);
  await assert.rejects(
    downloadVerifiedModel({
      url: "https://example.test/model",
      expectedSha256: "BAD",
      partialPath,
      finalPath,
      transport: async () => {
        throw new Error("network");
      },
    }),
    /lowercase hexadecimal/,
  );
  fs.rmSync(root, { recursive: true, force: true });
});
