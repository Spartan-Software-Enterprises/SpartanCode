const assert = require("assert");
const test = require("node:test");
const { getProviderStatus } = require("./provider-status");

test("provider status defaults to local-first", () => {
  const providers = getProviderStatus({});
  assert.equal(providers[0].status, "preferred");
  assert.equal(providers[1].status, "not configured");
});
