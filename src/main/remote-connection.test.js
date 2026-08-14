const assert = require("assert");
const test = require("node:test");
const {
  buildMoshArgs,
  getTransportStatus,
  validateRemoteConfig,
} = require("./remote-connection");

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

test("Mosh capability reports unavailable clients without hiding configuration validity", () => {
  const validation = validateRemoteConfig({
    host: "home.local",
    username: "dev",
    transport: "mosh",
  });
  assert.equal(validation.valid, true);
  assert.equal(validation.transportStatus.available, false);
  assert.match(validation.transportStatus.installHint, /mosh client/);
  assert.deepEqual(
    getTransportStatus("mosh", () => true),
    {
      transport: "mosh",
      available: true,
      installHint:
        "Install the mosh client and ensure the server has mosh-server",
    },
  );
});

test("Mosh launch arguments are tokenized and never include credentials", () => {
  assert.deepEqual(
    buildMoshArgs({ host: "home.local", username: "dev", port: 2222 }),
    ["--ssh=ssh -p 2222", "--", "dev@home.local"],
  );
  assert.throws(
    () => buildMoshArgs({ host: "home.local", username: "dev; touch /tmp/x" }),
    /Invalid Mosh configuration/,
  );
});
