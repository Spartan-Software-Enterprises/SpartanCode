import { availableAgents, bundledAgents } from "./agents";

describe("bundled Android agents", () => {
  it("provides a complete offline catalog", () => {
    expect(bundledAgents.map((agent) => agent.name)).toEqual([
      "leo",
      "researcher",
      "implementer",
      "verifier",
      "sync-guardian",
    ]);
    expect(availableAgents()).toEqual(bundledAgents);
  });

  it("only changes execution model for optional remote execution", () => {
    expect(
      availableAgents(true).every((agent) => agent.model === "dev-server"),
    ).toBe(true);
  });
});
