const assert = require("node:assert/strict");
const test = require("node:test");
const { MAX_SPEECH_LENGTH, createVoiceOutput } = require("./voice-output");

test("TTS uses fixed native arguments and bounds text", () => {
  let invocation;
  const service = createVoiceOutput({
    platform: "win32",
    spawnProcess(executable, args) {
      invocation = { executable, args };
      return { unref() {} };
    },
  });
  const result = service.speak("x".repeat(MAX_SPEECH_LENGTH + 10));
  assert.equal(result.length, MAX_SPEECH_LENGTH);
  assert.equal(invocation.executable, "powershell.exe");
  assert.ok(invocation.args.includes("-NonInteractive"));
  assert.equal(invocation.args.at(-1).length, MAX_SPEECH_LENGTH);
});

test("TTS rejects empty input", () => {
  assert.throws(
    () => createVoiceOutput({ platform: "linux" }).speak("  "),
    /required/,
  );
});

test("TTS reports a missing Linux runtime", async () => {
  const result = await createVoiceOutput({
    platform: "linux",
    spawnProcess() {
      return {
        once(event, callback) {
          if (event === "error") callback(new Error("missing"));
        },
      };
    },
  }).status();
  assert.equal(result.available, false);
});
