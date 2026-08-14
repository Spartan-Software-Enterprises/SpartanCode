const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createProtonPassProvider,
  validateReference,
} = require("./proton-pass");

test("Proton Pass references are constrained to pass:// URIs", () => {
  assert.equal(
    validateReference("pass://Development/GitHub/token"),
    "pass://Development/GitHub/token",
  );
  assert.throws(
    () => validateReference("https://example.test/secret"),
    /invalid/,
  );
  assert.throws(
    () => validateReference("pass://vault/item/field extra"),
    /invalid/,
  );
});

test("Proton Pass resolves through fixed non-shell CLI arguments", async () => {
  const calls = [];
  const provider = createProtonPassProvider({
    environment: { SPARTANCODE_PROTON_PASS_CLI: "/opt/pass-cli" },
    execFileImpl(binary, args, options, callback) {
      calls.push({ binary, args, options });
      callback(null, JSON.stringify({ value: "secret-value" }), "");
    },
  });
  assert.deepEqual(await provider.get("pass://Work/API/key"), {
    ok: true,
    reference: "pass://Work/API/key",
    value: "secret-value",
  });
  assert.equal(calls[0].binary, "/opt/pass-cli");
  assert.deepEqual(calls[0].args, [
    "item",
    "view",
    "pass://Work/API/key",
    "--output",
    "json",
  ]);
  assert.equal(calls[0].options.shell, false);
});

test("Proton Pass version output is bounded", async () => {
  const provider = createProtonPassProvider({
    environment: { PROTON_PASS_CLI: "pass-cli" },
    execFileImpl(_binary, _args, _options, callback) {
      callback(null, "pass-cli 1.0.0\n", "");
    },
  });
  assert.deepEqual(await provider.version(), {
    ok: true,
    output: "pass-cli 1.0.0",
  });
});
