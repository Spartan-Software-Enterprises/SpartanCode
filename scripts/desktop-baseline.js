#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");

function argument(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function currentCommit() {
  return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

function lastCount(output, label) {
  const matches = [
    ...output.matchAll(new RegExp(`(?:#|ℹ) ${label} (\\d+)`, "g")),
  ];
  return matches.length ? Number(matches.at(-1)[1]) : null;
}

function main(argv = process.argv.slice(2)) {
  const outputPath = path.resolve(
    argument(
      argv,
      "--output",
      path.join(root, "dist", "desktop-baseline.json"),
    ),
  );
  const result = spawnSync("npm", ["test"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const testCount = lastCount(output, "tests");
  const passCount = lastCount(output, "pass");
  const failCount = lastCount(output, "fail");
  const status =
    result.status === 0 &&
    testCount !== null &&
    passCount === testCount &&
    failCount === 0
      ? "PASS"
      : "FAIL";
  const evidence = {
    schemaVersion: 1,
    status,
    commit: currentCommit(),
    testCount,
    passCount,
    failCount,
    formatCheck: status === "PASS" ? "PASS" : "UNKNOWN",
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence));
  if (status !== "PASS") process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { lastCount, main };
