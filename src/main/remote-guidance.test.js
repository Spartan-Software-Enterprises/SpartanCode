const assert = require("assert");
const test = require("node:test");
const {
  estimateServerCost,
  buildServerSetupPlan,
  getRouterGuidance,
  listServerProviders,
  listServerTemplates,
} = require("./remote-guidance");

test("remote guidance exposes provider plans and bounded cost estimates", () => {
  assert.ok(
    listServerProviders().some((provider) => provider.id === "digitalocean"),
  );
  assert.deepEqual(estimateServerCost("digitalocean", "basic", 730), {
    provider: "DigitalOcean",
    plan: "Basic shared CPU",
    memoryGb: 1,
    hourly: 0.006,
    hours: 730,
    estimatedMonthly: 4.38,
    disclaimer:
      "Estimate excludes provider taxes, storage, bandwidth, backups, and model downloads.",
  });
  assert.throws(() => estimateServerCost("unknown", "basic"), /Unknown server/);
});

test("router guidance prefers explicit exposure and verification steps", () => {
  const guidance = getRouterGuidance("tailscale");
  assert.equal(guidance.exposure, "private");
  assert.equal(guidance.steps.length, 3);
  assert.throws(() => getRouterGuidance("dmz"), /Unknown router/);
});

test("home server templates include verification commands", () => {
  assert.ok(
    listServerTemplates().every((template) => template.verification.length > 0),
  );
});

test("home server setup plans are bounded and require explicit approval", () => {
  const plan = buildServerSetupPlan("ubuntu-agent-server", "tailscale");
  assert.equal(plan.exposure, "private");
  assert.equal(plan.requiresExplicitApproval, true);
  assert.ok(plan.commands.every((command) => !/[;&|`$]/.test(command)));
  assert.throws(() => buildServerSetupPlan("unknown"), /Unknown server/);
});
