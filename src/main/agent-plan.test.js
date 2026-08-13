const assert = require("assert");
const test = require("node:test");
const { createExecutionPlan } = require("./agent-plan");

test("agent planner creates a safe three-stage plan", () => {
  const plan = createExecutionPlan("Build an offline model picker");
  assert.equal(plan.stages.length, 3);
  assert.match(plan.assumptions[1], /approval/);
});
