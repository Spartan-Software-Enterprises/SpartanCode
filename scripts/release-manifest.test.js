const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const {
  createReleaseManifest,
  writeReleaseEvidence,
} = require("./release-manifest");

test("release evidence inventories lockfiles and hashes scanned artifacts", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-release-"),
  );
  fs.mkdirSync(path.join(directory, "android"));
  fs.writeFileSync(
    path.join(directory, "package-lock.json"),
    JSON.stringify({
      packages: {
        "": {},
        "node_modules/example": {
          name: "example",
          version: "1.0.0",
          license: "MIT",
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(directory, "android", "package-lock.json"),
    JSON.stringify({ packages: {} }),
  );
  const artifactDirectory = path.join(directory, "artifacts");
  fs.mkdirSync(artifactDirectory);
  fs.writeFileSync(path.join(artifactDirectory, "app.bin"), "release");
  const manifest = createReleaseManifest({
    rootDir: directory,
    scanDirectories: [artifactDirectory],
  });
  assert.equal(manifest.components[0].name, "example");
  assert.equal(manifest.artifacts[0].path, path.join("artifacts", "app.bin"));
  assert.equal(manifest.artifacts[0].sha256.length, 64);
  const outputDirectory = path.join(directory, "evidence");
  writeReleaseEvidence({
    rootDir: directory,
    outputDirectory,
    scanDirectories: [artifactDirectory],
  });
  assert.match(
    fs.readFileSync(
      path.join(outputDirectory, "THIRD_PARTY_NOTICES.txt"),
      "utf8",
    ),
    /example@1\.0\.0/,
  );
  fs.rmSync(directory, { recursive: true, force: true });
});
