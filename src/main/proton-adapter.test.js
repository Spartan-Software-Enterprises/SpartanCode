const assert = require("node:assert/strict");
const test = require("node:test");
const { createProtonAdapter } = require("./proton-adapter");

function vault(value = "secret") {
  return { get: () => value };
}

test("Proton adapter requires HTTPS and encrypted token configuration", () => {
  const adapter = createProtonAdapter({
    environment: { PROTON_API_BASE: "http://proton.invalid" },
    secureVault: vault(),
  });
  assert.equal(adapter.status().available, false);
});

test("Proton adapter performs bounded allowlisted GET requests", async () => {
  let request;
  const adapter = createProtonAdapter({
    environment: { PROTON_API_BASE: "https://proton.invalid" },
    secureVault: vault("encrypted-token"),
    fetchImpl: async (url, init) => {
      request = { url: String(url), init };
      return { ok: true, status: 200, text: async () => '{"ok":true}' };
    },
  });
  const result = await adapter.request({ path: "/api/core/v4/users" });
  assert.equal(result.ok, true);
  assert.equal(request.init.method, "GET");
  assert.equal(request.init.headers.Authorization, "Bearer encrypted-token");
  assert.equal(
    (await adapter.request({ path: "/api/core/v4/users/1" })).code,
    "path-not-allowlisted",
  );
});
