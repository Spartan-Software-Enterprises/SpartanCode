#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const androidRoot = path.join(root, "android");

function commandExists(command) {
  try {
    execFileSync("which", [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function run(label, command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    label,
    status: result.status === 0 ? "pass" : "fail",
    exitCode: result.status,
    output: String(result.stdout || result.stderr || "").slice(-4000),
  };
}

function skip(label, reason) {
  return { label, status: "skip", reason };
}

function buildReport() {
  const checks = [
    run("Android TypeScript", "npm", ["run", "typecheck"], androidRoot),
    run("Android unit tests", "npm", ["test", "--", "--runInBand"], androidRoot),
    run("Android formatting", "npm", ["run", "format:check"], androidRoot),
    run("Expo configuration", "npx", ["expo", "config", "--type", "public"], androidRoot),
  ];
  if (commandExists("adb")) {
    const devices = spawnSync("adb", ["devices"], { encoding: "utf8" });
    const connected = String(devices.stdout || "")
      .split("\n")
      .some((line) => /\tdevice$/.test(line));
    checks.push(
      connected
        ? { label: "ADB device discovery", status: "pass", output: devices.stdout }
        : skip("ADB device discovery", "adb is installed but no device is connected"),
    );
  } else checks.push(skip("ADB device discovery", "adb is not installed in this environment"));

  const keystore = process.env.SPARTANCODE_KEYSTORE_FILE;
  checks.push(
    keystore && path.isAbsolute(keystore) && fs.existsSync(keystore)
      ? { label: "Release keystore", status: "pass", output: "keystore path exists" }
      : skip("Release keystore", "release keystore is intentionally supplied only by the release environment"),
  );
  checks.push(
    process.env.SPARTANCODE_REMOTE_HOST
      ? skip(
          "AWS validation host",
          "remote validation is intentionally run only through the synchronized operational workflow",
        )
      : skip("AWS validation host", "SPARTANCODE_REMOTE_HOST is not configured"),
  );
  return checks;
}

function outputPath(argv) {
  const index = argv.indexOf("--output");
  return index >= 0 && argv[index + 1]
    ? path.resolve(argv[index + 1])
    : path.join(root, "dist", "android-verification.json");
}

const checks = buildReport();
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  commit: (() => {
    try {
      return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    } catch {
      return "unknown";
    }
  })(),
  checks,
  summary: {
    passed: checks.filter((check) => check.status === "pass").length,
    skipped: checks.filter((check) => check.status === "skip").length,
    failed: checks.filter((check) => check.status === "fail").length,
  },
};
const destination = outputPath(process.argv.slice(2));
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
if (report.summary.failed) process.exitCode = 1;
