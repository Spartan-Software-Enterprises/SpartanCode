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

function visualGate(visualResult) {
  if (!visualResult)
    return gate("SKIP", "Visual smoke result was not supplied");
  if (visualResult.commit !== commit())
    return gate("FAIL", "Visual smoke result is tied to a different commit");
  if (!Array.isArray(visualResult.views) || visualResult.views.length < 5)
    return gate("FAIL", "Visual smoke result is missing required views");
  if (
    !Array.isArray(visualResult.screenshots) ||
    visualResult.screenshots.length < 11
  )
    return gate("FAIL", "Visual smoke result is missing required screenshots");
  if (Array.isArray(visualResult.errors) && visualResult.errors.length)
    return gate("FAIL", "Visual smoke reported renderer errors");
  return gate(
    "PASS",
    "Visual smoke passed with navigation and menu evidence",
    visualResult.screenshots,
  );
}

function kvmGate(kvmResult) {
  if (!kvmResult)
    return gate("SKIP", "KVM emulator evidence was not supplied");
  if (kvmResult.commit !== commit())
    return gate("FAIL", "KVM emulator evidence is tied to a different commit");
  if (kvmResult.status !== "PASS")
    return gate("FAIL", "KVM emulator evidence did not pass");
  if (
    typeof kvmResult.screenshot !== "string" ||
    !/^[a-f0-9]{64}$/.test(kvmResult.screenshotSha256 || "")
  )
    return gate("FAIL", "KVM emulator evidence is missing a screenshot hash");
  return gate(
    "PASS",
    "KVM emulator installed, launched, and captured the release APK",
    [kvmResult.screenshot, kvmResult.screenshotSha256],
  );
}

function buildIndex({ verification, visualResult, kvmResult, target }) {
  const android = androidGate(verification);
  const checks = {
    "Canonical source": gate(
      "SKIP",
      "Run scripts/verify-sync.sh for synchronized source evidence",
    ),
    "Desktop baseline": gate("SKIP", "Run npm test in the release environment"),
    "Desktop visual smoke": visualGate(visualResult),
    "Android baseline": android,
    "KVM emulator": kvmGate(kvmResult),
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
  const visualPath = argument(argv, "--visual-result", null);
  const kvmPath = argument(argv, "--kvm-result", null);
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
  const visualResult = visualPath
    ? JSON.parse(fs.readFileSync(path.resolve(visualPath), "utf8"))
    : null;
  const kvmResult = kvmPath
    ? JSON.parse(fs.readFileSync(path.resolve(kvmPath), "utf8"))
    : null;
  const index = buildIndex({ verification, visualResult, kvmResult, target });
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

module.exports = { CHECKER_VERSION, GATES, buildIndex, kvmGate, main };
