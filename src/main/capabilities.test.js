const assert = require("assert");
const test = require("node:test");
const { getCapabilities } = require("./capabilities");

test("capability discovery reports optional integrations without crashing", () => {
  const capabilities = getCapabilities();
  assert.equal(typeof capabilities.sqlite.status, "string");
  assert.equal(typeof capabilities.remoteSsh.status, "string");
});
