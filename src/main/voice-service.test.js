const assert = require("assert");
const test = require("node:test");
const { createVoiceService } = require("./voice-service");

test("voice service degrades safely when native voice runtime is unavailable", () => {
  const service = createVoiceService();
  assert.equal(service.status().available, false);
  assert.throws(() => service.start(), /voice runtime/);
});
