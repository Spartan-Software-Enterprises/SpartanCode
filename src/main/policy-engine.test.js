const assert = require("assert");
const test = require("node:test");
const { classifyCommand, requiresMissionApproval } = require("./policy-engine");

test("policy engine gates dangerous commands", () => {
  assert.equal(classifyCommand("git status").requiresApproval, false);
  assert.equal(classifyCommand("git push origin main").requiresApproval, true);
  assert.match(classifyCommand("rm -rf build").reason, /remove/);
});

test("YOLO mode bypasses only the interactive mission approval gate", () => {
  assert.equal(requiresMissionApproval("git push origin main", "guided"), true);
  assert.equal(requiresMissionApproval("git push origin main", "yolo"), false);
  assert.equal(classifyCommand("git push origin main").requiresApproval, true);
});
