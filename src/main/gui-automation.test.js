const assert = require("node:assert/strict");
const test = require("node:test");
const { createGuiAutomation } = require("./gui-automation");

test("GUI automation reports review-required execution", () => {
  const adapter = createGuiAutomation({ platform: "win32" });
  assert.equal(
    adapter.execute({ action: "click", target: "button" }).status,
    "review-required",
  );
});

test("GUI automation reports unavailable platform honestly", async () => {
  const result = await createGuiAutomation({ platform: "linux" }).status();
  assert.equal(result.uiAutomation, "platform-unavailable");
  assert.equal(result.execution, "review-required");
});
