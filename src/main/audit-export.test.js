const assert = require("assert");
const test = require("node:test");
const { exportAuditLog, verifyAuditExport } = require("./audit-export");

test("audit export redacts credentials and verifies its integrity hash", () => {
  const bundle = exportAuditLog(
    [
      {
        action: "connection:saved",
        token: "never-export",
        nested: { privateKey: "also-never-export" },
        timestamp: "2026-08-13T00:00:00.000Z",
      },
    ],
    { now: "2026-08-13T01:00:00.000Z" },
  );
  assert.equal(bundle.events[0].token, "[REDACTED]");
  assert.equal(bundle.events[0].nested.privateKey, "[REDACTED]");
  assert.equal(verifyAuditExport(bundle), true);
  bundle.events[0].action = "tampered";
  assert.equal(verifyAuditExport(bundle), false);
});

test("audit export bounds the event set", () => {
  const bundle = exportAuditLog(
    Array.from({ length: 1100 }, (_, index) => ({ index })),
  );
  assert.equal(bundle.eventCount, 1000);
});
