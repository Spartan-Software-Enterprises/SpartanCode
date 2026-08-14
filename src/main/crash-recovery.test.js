const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  createCrashReporter,
  createRendererRecoveryController,
  redact,
} = require("./crash-recovery");

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

test("renderer recovery reloads a bounded number of times and then fails closed", () => {
  const records = [];
  let reloads = 0;
  const controller = createRendererRecoveryController({
    reporter: { record: (...entry) => records.push(entry) },
    reload: () => {
      reloads += 1;
    },
    maxAttempts: 2,
  });

  assert.deepEqual(controller.handle({ reason: "crashed" }), {
    reloaded: true,
    exhausted: false,
  });
  assert.deepEqual(controller.handle({ reason: "crashed" }), {
    reloaded: true,
    exhausted: false,
  });
  assert.deepEqual(controller.handle({ reason: "crashed" }), {
    reloaded: false,
    exhausted: true,
  });
  assert.equal(reloads, 2);
  assert.equal(records.at(-1)[0], "renderer-recovery-exhausted");

  controller.reset();
  assert.equal(controller.handle({ reason: "clean-exit" }).reloaded, false);
  assert.equal(reloads, 2);
});
