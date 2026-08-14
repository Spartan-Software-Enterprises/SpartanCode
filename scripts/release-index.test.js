const assert = require("node:assert/strict");
const test = require("node:test");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { GATES, buildIndex } = require("./release-index");

test("release index preserves incomplete gates and binds Android evidence to the commit", () => {
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const index = buildIndex({
    target: "test",
    verification: {
      commit,
      checks: [
        "Android TypeScript",
        "Android unit tests",
        "Android formatting",
        "Expo configuration",
        "Committed visual assets",
      ].map((label) => ({ label, status: "pass" })),
    },
    visualResult: {
      commit,
      views: ["home", "projects", "agents", "artifacts", "settings"],
      screenshots: Array.from(
        { length: 11 },
        (_, index) => `screen-${index}.png`,
      ),
      errors: [],
    },
  });
  assert.equal(index.releaseCommit, commit);
  assert.equal(index.status, "INCOMPLETE");
  assert.deepEqual(
    index.gates.map((gate) => gate.name),
    GATES,
  );
  assert.equal(
    index.gates.find((gate) => gate.name === "Android baseline").status,
    "PASS",
  );
  assert.equal(
    index.gates.find((gate) => gate.name === "Desktop visual smoke").status,
    "PASS",
  );
  assert.equal(
    index.gates.find((gate) => gate.name === "Physical device").status,
    "SKIP",
  );
});

test("release index accepts commit-bound KVM emulator evidence", () => {
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const index = buildIndex({
    verification: {
      commit,
      checks: [
        "Android TypeScript",
        "Android unit tests",
        "Android formatting",
        "Expo configuration",
        "Committed visual assets",
      ].map((label) => ({ label, status: "pass" })),
    },
    kvmResult: {
      status: "PASS",
      commit,
      screenshot: "/tmp/spartancode-kvm-screen.png",
      screenshotSha256: "a".repeat(64),
    },
    target: "SpartanCode beta",
  });
  const kvm = index.gates.find((gate) => gate.name === "KVM emulator");
  assert.equal(kvm.status, "PASS");
  assert.deepEqual(kvm.evidence, [
    "/tmp/spartancode-kvm-screen.png",
    "a".repeat(64),
  ]);
});

test("release index accepts commit-bound desktop baseline evidence", () => {
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const index = buildIndex({
    desktopResult: {
      status: "PASS",
      commit,
      testCount: 208,
      passCount: 208,
      failCount: 0,
      formatCheck: "PASS",
    },
    target: "SpartanCode beta",
  });
  const desktop = index.gates.find((gate) => gate.name === "Desktop baseline");
  assert.equal(desktop.status, "PASS");
  assert.deepEqual(desktop.evidence, ["desktop-tests:208"]);
});

test("release index fails closed when Android evidence belongs to another commit", () => {
  const index = buildIndex({
    target: "test",
    verification: { commit: "0".repeat(40), checks: [] },
  });
  assert.equal(
    index.gates.find((gate) => gate.name === "Android baseline").status,
    "FAIL",
  );
  assert.equal(index.status, "FAIL");
});

test("release index CLI writes a bounded machine-readable file", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-release-index-"),
  );
  const output = path.join(directory, "release-index.json");
  execFileSync(
    process.execPath,
    [path.join(__dirname, "release-index.js"), "--output", output],
    {
      cwd: path.resolve(__dirname, ".."),
      stdio: "ignore",
    },
  );
  const parsed = JSON.parse(fs.readFileSync(output, "utf8"));
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.gates.length, GATES.length);
  fs.rmSync(directory, { recursive: true, force: true });
});
