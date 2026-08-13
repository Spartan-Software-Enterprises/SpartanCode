const assert = require("assert");
const test = require("node:test");
const { validateRemoteConfig } = require("./remote-connection");

test("remote configuration validates transport and required identity", () => {
  assert.equal(
    validateRemoteConfig({
      host: "home.local",
      username: "dev",
      transport: "mosh",
    }).valid,
    true,
  );
  assert.deepEqual(validateRemoteConfig({ transport: "ssh" }).missing, [
    "host",
    "username",
  ]);
});
