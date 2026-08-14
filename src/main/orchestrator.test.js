const assert = require("assert");
const test = require("node:test");
const { parseCommand, validatePlan } = require("./orchestrator");

test("orchestrator annotates plans with policy decisions", () => {
  const plan = validatePlan([
    { name: "status", command: "git status" },
    { name: "publish", command: "git push" },
  ]);
  assert.equal(plan[0].policy.requiresApproval, false);
  assert.equal(plan[1].policy.requiresApproval, true);
});

test("orchestrator rejects shell metacharacters before execution", () => {
  assert.deepEqual(parseCommand("git status"), {
    executable: "git",
    args: ["status"],
  });
  assert.equal(parseCommand("git status && curl example.com"), null);
  assert.equal(parseCommand("$(touch /tmp/pwned)"), null);
});
