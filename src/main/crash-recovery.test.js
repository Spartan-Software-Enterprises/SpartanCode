const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createCrashReporter, redact } = require("./crash-recovery");

test("crash reporter redacts credential-like values", () => {
  const text = redact(
    "token=secret-value Authorization: Bearer abc.def password=hunter2",
  );
  assert.equal(text.includes("secret-value"), false);
  assert.equal(text.includes("abc.def"), false);
  assert.equal(text.includes("hunter2"), false);
});

test("crash reporter keeps bounded atomic diagnostic history", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-crash-"),
  );
  const filePath = path.join(directory, "crash-recovery.json");
  const reporter = createCrashReporter(filePath);
  for (let index = 0; index < 25; index += 1)
    reporter.record("renderer-process-gone", {
      reason: "crashed",
      message: `failure-${index}`,
    });

  const records = reporter.read();
  assert.equal(records.length, 20);
  assert.equal(records[0].message, "failure-24");
  assert.equal(records.at(-1).message, "failure-5");
  assert.equal(
    fs.readdirSync(directory).some((name) => name.endsWith(".tmp")),
    false,
  );
  fs.rmSync(directory, { recursive: true, force: true });
});
