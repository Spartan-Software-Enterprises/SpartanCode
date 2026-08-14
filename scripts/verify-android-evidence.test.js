const assert = require("node:assert/strict");
const test = require("node:test");
const { execFileSync } = require("node:child_process");
const {
  REQUIRED_CHECKS,
  verifyAndroidEvidence,
} = require("./verify-android-evidence");

function report(
  commit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
) {
  const checks = REQUIRED_CHECKS.map((label) => ({ label, status: "pass" }));
  checks.push({
    label: "ADB device discovery",
    status: "skip",
    reason: "No device",
  });
  return {
    schemaVersion: 1,
    commit,
    checks,
    summary: { passed: 5, skipped: 1, failed: 0 },
  };
}

test("accepts current Android static evidence and preserves environment skips", () => {
  assert.deepEqual(verifyAndroidEvidence(report()).valid, true);
});

test("rejects stale, incomplete, failed, malformed, or miscounted evidence", () => {
  assert.throws(
    () => verifyAndroidEvidence(report("0".repeat(40))),
    /different commit/,
  );
  const missing = report();
  missing.checks = missing.checks.slice(1);
  missing.summary = { passed: 4, skipped: 1, failed: 0 };
  assert.throws(() => verifyAndroidEvidence(missing), /Missing required/);
  const failed = report();
  failed.checks[0].status = "skip";
  failed.checks[0].reason = "not run";
  failed.summary = { passed: 4, skipped: 2, failed: 0 };
  assert.throws(() => verifyAndroidEvidence(failed), /not passing/);
  const malformed = report();
  malformed.checks[0].status = "maybe";
  assert.throws(() => verifyAndroidEvidence(malformed), /malformed/);
  const miscounted = report();
  miscounted.summary.passed = 99;
  assert.throws(() => verifyAndroidEvidence(miscounted), /summary mismatch/);
});
