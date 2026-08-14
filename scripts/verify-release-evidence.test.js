const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { verifyReleaseEvidence } = require("./verify-release-evidence");

function fixture() {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-evidence-"),
  );
  fs.mkdirSync(path.join(rootDir, "dist", "release-evidence"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(rootDir, "src"));
  fs.writeFileSync(path.join(rootDir, "src", "control.js"), "control");
  const artifactPath = path.join(rootDir, "app.aab");
  fs.writeFileSync(artifactPath, "artifact");
  const hash = crypto.createHash("sha256").update("artifact").digest("hex");
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    gitCommit: "a".repeat(40),
    artifacts: [{ path: "app.aab", bytes: 8, sha256: hash }],
    components: [
      { name: "example", version: "1.0.0", license: "MIT", source: "lock" },
    ],
    controlEvidence: [
      {
        id: "control",
        sourceFiles: ["src/control.js"],
        releaseGate: "source-control-evidence",
      },
    ],
  };
  const evidenceDir = path.join(rootDir, "dist", "release-evidence");
  fs.writeFileSync(
    path.join(evidenceDir, "release-manifest.json"),
    JSON.stringify(manifest),
  );
  fs.writeFileSync(
    path.join(evidenceDir, "THIRD_PARTY_NOTICES.txt"),
    "example@1.0.0\nsha256:" + hash + "\n",
  );
  return {
    rootDir,
    manifestPath: path.join(evidenceDir, "release-manifest.json"),
  };
}

test("verifies intact release evidence", () => {
  const values = fixture();
  assert.deepEqual(
    verifyReleaseEvidence({ ...values, requireCurrentCommit: false }),
    {
      gitCommit: "a".repeat(40),
      artifactCount: 1,
      componentCount: 1,
      controlEvidenceCount: 1,
    },
  );
  fs.rmSync(values.rootDir, { recursive: true, force: true });
});

test("rejects a modified artifact", () => {
  const values = fixture();
  fs.writeFileSync(path.join(values.rootDir, "app.aab"), "tampered");
  assert.throws(
    () => verifyReleaseEvidence({ ...values, requireCurrentCommit: false }),
    /hash mismatch for app\.aab/,
  );
  fs.rmSync(values.rootDir, { recursive: true, force: true });
});

test("rejects an artifact path outside the release root", () => {
  const values = fixture();
  const manifest = JSON.parse(fs.readFileSync(values.manifestPath, "utf8"));
  manifest.artifacts[0].path = "../outside.aab";
  fs.writeFileSync(values.manifestPath, JSON.stringify(manifest));
  assert.throws(
    () => verifyReleaseEvidence({ ...values, requireCurrentCommit: false }),
    /escapes the release root/,
  );
  fs.rmSync(values.rootDir, { recursive: true, force: true });
});
