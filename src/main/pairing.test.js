const test = require("node:test");
const assert = require("node:assert/strict");
const { createPairingService } = require("./pairing");

test("pairing payloads are short-lived, origin-bound, and one-time", () => {
  const service = createPairingService({
    origin: "https://bridge.example",
    token: "secret",
  });
  const payload = service.create();
  const result = service.redeem(payload);
  assert.equal(result.origin, "https://bridge.example");
  assert.throws(() => service.redeem(payload), /already used/);
});

test("pairing rejects payloads from another bridge", () => {
  const first = createPairingService({
    origin: "https://one.example",
    token: "a",
  });
  const second = createPairingService({
    origin: "https://two.example",
    token: "b",
  });
  assert.throws(() => second.redeem(first.create()), /already used/);
});
