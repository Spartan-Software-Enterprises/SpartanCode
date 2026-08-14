import {
  estimateRemoteCost,
  buildSetupPlan,
  remoteProviders,
  routerGuidance,
} from "./remote-guidance";

describe("standalone remote guidance", () => {
  it("provides cost estimates without requiring a bridge", () => {
    expect(remoteProviders).toHaveLength(5);
    expect(estimateRemoteCost("hetzner").estimatedMonthly).toBe(2.92);
  });

  it("labels public router methods so users can choose deliberately", () => {
    expect(routerGuidance.tailscale.exposure).toBe("private");
    expect(routerGuidance.upnp.exposure).toBe("public");
  });

  it("creates an offline setup plan without provisioning anything", () => {
    const plan = buildSetupPlan("ubuntu-agent-server");
    expect(plan.provisioning).toBe("guidance-only");
    expect(plan.requiresExplicitApproval).toBe(true);
    expect(plan.steps.length).toBeGreaterThan(2);
  });
});
