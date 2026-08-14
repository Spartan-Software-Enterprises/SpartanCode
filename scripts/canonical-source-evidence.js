#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

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

function main(argv = process.argv.slice(2)) {
  const outputPath = path.resolve(
    argument(
      argv,
      "--output",
      path.join(root, "dist", "canonical-source-evidence.json"),
    ),
  );
  const commit = currentCommit();
  let synchronizedCommit = null;
  let status = "FAIL";
  try {
    const output = execFileSync("bash", ["scripts/verify-sync.sh"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const matches = [...output.matchAll(/synchronized_commit=([0-9a-f]{40})/g)];
    synchronizedCommit = matches.length ? matches.at(-1)[1] : null;
    status = synchronizedCommit === commit ? "PASS" : "FAIL";
  } catch {
    status = "FAIL";
  }
  const evidence = { schemaVersion: 1, status, commit, synchronizedCommit };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence));
  if (status !== "PASS") process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { main };
