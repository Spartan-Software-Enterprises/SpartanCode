#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const REQUIRED_CHECKS = [
  "Android TypeScript",
  "Android unit tests",
  "Android formatting",
  "Expo configuration",
  "Committed visual assets",
];
const ALLOWED_STATUSES = new Set(["pass", "skip", "fail"]);

function currentCommit() {
  return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

function verifyAndroidEvidence(report, expectedCommit = currentCommit()) {
  if (!report || report.schemaVersion !== 1)
    throw new Error("Android evidence must use schemaVersion 1");
  if (!/^[0-9a-f]{40}$/.test(report.commit))
    throw new Error("Android evidence has an invalid commit");
  if (report.commit !== expectedCommit)
    throw new Error("Android evidence belongs to a different commit");
  if (!Array.isArray(report.checks) || !report.checks.length)
    throw new Error("Android evidence has no checks");
  const labels = new Set();
  for (const check of report.checks) {
    if (
      !check ||
      typeof check.label !== "string" ||
      !ALLOWED_STATUSES.has(check.status)
    )
      throw new Error("Android evidence contains a malformed check");
    if (labels.has(check.label))
      throw new Error(`Duplicate Android check: ${check.label}`);
    labels.add(check.label);
    if (check.status === "skip" && typeof check.reason !== "string")
      throw new Error(`Skipped Android check needs a reason: ${check.label}`);
  }
  for (const label of REQUIRED_CHECKS) {
    const check = report.checks.find((candidate) => candidate.label === label);
    if (!check) throw new Error(`Missing required Android check: ${label}`);
    if (check.status !== "pass")
      throw new Error(`Required Android check is not passing: ${label}`);
  }
  const summary = report.summary;
  if (!summary || typeof summary !== "object")
    throw new Error("Android evidence has no summary");
  for (const status of ["pass", "skip", "fail"]) {
    const actual = report.checks.filter(
      (check) => check.status === status,
    ).length;
    const summaryKey =
      status === "pass" ? "passed" : status === "skip" ? "skipped" : "failed";
    if (summary[summaryKey] !== actual)
      throw new Error(`Android evidence summary mismatch for ${status}`);
  }
  return {
    valid: true,
    commit: report.commit,
    checks: report.checks.length,
    passed: summary.passed,
    skipped: summary.skipped,
    failed: summary.failed,
  };
}

function main(argv = process.argv.slice(2)) {
  const index = argv.indexOf("--report");
  const reportPath = path.resolve(
    index >= 0 && argv[index + 1]
      ? argv[index + 1]
      : path.join(root, "dist", "android-verification.json"),
  );
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const result = verifyAndroidEvidence(report);
  console.log(JSON.stringify({ report: reportPath, ...result }));
  return result;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Android evidence verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { REQUIRED_CHECKS, verifyAndroidEvidence };
