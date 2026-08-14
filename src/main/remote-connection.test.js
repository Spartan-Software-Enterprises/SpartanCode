const assert = require("assert");
const test = require("node:test");
const { EventEmitter } = require("node:events");
const {
  buildMoshArgs,
  createMoshSession,
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

test("Mosh session lifecycle reports ready, error, and ended states", () => {
  const child = new EventEmitter();
  child.kill = () => child.emit("close", 0, null);
  const session = createMoshSession(
    { host: "home.local", username: "dev", port: 2222 },
    {
      spawnProcess: (command, args, options) => {
        assert.equal(command, "mosh");
        assert.deepEqual(args, ["--ssh=ssh -p 2222", "--", "dev@home.local"]);
        assert.deepEqual(options, { stdio: "pipe" });
        return child;
      },
    },
  );
  const states = [];
  session.onChange((value) => states.push(value.state));
  assert.equal(session.start().state, "connecting");
  child.emit("spawn");
  assert.equal(session.snapshot().state, "ready");
  assert.equal(session.stop().state, "ended");
  assert.deepEqual(states, ["connecting", "ready", "ended"]);
  assert.match(session.snapshot().serverRequirement, /mosh-server.*UDP/);
});

test("Mosh session surfaces process errors without exposing credentials", () => {
  const child = new EventEmitter();
  child.kill = () => undefined;
  const session = createMoshSession(
    { host: "home.local", username: "dev" },
    { spawnProcess: () => child },
  );
  session.start();
  child.emit("error", new Error("mosh unavailable for dev@home.local"));
  assert.equal(session.snapshot().state, "error");
  assert.equal(session.snapshot().error, "mosh unavailable for dev@home.local");
  assert.equal(JSON.stringify(session.snapshot()).includes("password"), false);
});
