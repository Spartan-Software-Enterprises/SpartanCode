#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const CHECKER_VERSION = "spartancode-release-index/1";
const GATES = [
  "Canonical source",
  "Desktop baseline",
  "Desktop visual smoke",
  "Android baseline",
  "KVM emulator",
  "Physical device",
  "Signed artifacts",
  "Integrity bundle",
  "Product acceptance",
];

function argument(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function commit() {
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function gate(status, reason, evidence = []) {
  return { status, reason, evidence };
}

function androidGate(verification) {
  if (!verification) {
    return gate("SKIP", "Android verification report was not supplied");
  }
  if (verification.commit !== commit()) {
    return gate(
      "FAIL",
      "Android verification report is tied to a different commit",
    );
  }
  const checks = Array.isArray(verification.checks) ? verification.checks : [];
  const required = [
    "Android TypeScript",
    "Android unit tests",
    "Android formatting",
    "Expo configuration",
    "Committed visual assets",
  ];
  const missing = required.filter(
    (label) => !checks.some((check) => check.label === label),
  );
  if (missing.length)
    return gate("FAIL", `Android report is missing: ${missing.join(", ")}`);
  const failures = checks.filter(
    (check) => required.includes(check.label) && check.status !== "pass",
  );
  if (failures.length)
    return gate("FAIL", "One or more Android baseline checks failed");
  return gate(
    "PASS",
    "Android verification report passed the required baseline checks",
    ["android-verification.json"],
  );
}

function buildIndex({ verification, target }) {
  const android = androidGate(verification);
  const checks = {
    "Canonical source": gate(
      "SKIP",
      "Run scripts/verify-sync.sh for synchronized source evidence",
    ),
    "Desktop baseline": gate("SKIP", "Run npm test in the release environment"),
    "Desktop visual smoke": gate(
      "SKIP",
      "Run the Playwright visual smoke suite and review screenshots",
    ),
    "Android baseline": android,
    "KVM emulator": gate(
      "SKIP",
      "Requires a usable /dev/kvm and a booted pinned AVD",
    ),
    "Physical device": gate(
      "SKIP",
      "Requires an authorized physical Android device",
    ),
    "Signed artifacts": gate(
      "SKIP",
      "Requires release-owned signing credentials and generated artifacts",
    ),
    "Integrity bundle": gate(
      "SKIP",
      "Run release manifest, dependency inventory, and roadmap audit for this commit",
    ),
    "Product acceptance": gate(
      "SKIP",
      "Requires product-owner scope, privacy, and consent sign-off",
    ),
  };
  return {
    schemaVersion: 1,
    releaseCommit: commit(),
    generatedAt: new Date().toISOString(),
    target,
    checkerVersion: CHECKER_VERSION,
    status: Object.values(checks).some((check) => check.status === "FAIL")
      ? "FAIL"
      : Object.values(checks).every((check) => check.status === "PASS")
        ? "PASS"
        : "INCOMPLETE",
    gates: GATES.map((name) => ({ name, ...checks[name] })),
  };
}

function main(argv = process.argv.slice(2)) {
  const verificationPath = argument(argv, "--android-verification", null);
  const output = path.resolve(
    argument(argv, "--output", path.join(root, "dist", "release-index.json")),
  );
  const target = argument(argv, "--target", "SpartanCode beta");
  let verification = null;
  if (verificationPath) {
    verification = JSON.parse(
      fs.readFileSync(path.resolve(verificationPath), "utf8"),
    );
  }
  const index = buildIndex({ verification, target });
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(index, null, 2)}\n`);
  console.log(
    JSON.stringify({
      output,
      status: index.status,
      releaseCommit: index.releaseCommit,
    }),
  );
  return index;
}

if (require.main === module) main();

module.exports = { CHECKER_VERSION, GATES, buildIndex, main };
