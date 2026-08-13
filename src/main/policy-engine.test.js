const assert = require("assert");
const test = require("node:test");
const { classifyCommand } = require("./policy-engine");

test("policy engine gates dangerous commands", () => {
  assert.equal(classifyCommand("git status").requiresApproval, false);
  assert.equal(classifyCommand("git push origin main").requiresApproval, true);
  assert.match(classifyCommand("rm -rf build").reason, /remove/);
});
