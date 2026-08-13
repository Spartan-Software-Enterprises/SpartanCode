import {
  estimateRemoteCost,
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
});
