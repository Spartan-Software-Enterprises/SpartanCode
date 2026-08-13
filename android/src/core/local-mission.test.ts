import { createLocalPlanningEvidence } from "./local-mission";

describe("standalone offline mission planning", () => {
  it("persists explainable plan evidence without claiming execution", () => {
    const evidence = createLocalPlanningEvidence(
      "mission-1",
      "Add a settings screen",
      "2026-08-13T12:00:00.000Z",
    );
    expect(evidence.artifact.status).toBe("ready");
    expect(evidence.artifact.missionId).toBe("mission-1");
    expect(evidence.artifact.content).toContain('"execution":"queued"');
    expect(evidence.activity.message).toMatch(/remain queued/);
    expect(evidence.audit.action).toBe("mission:planned-offline");
  });
});
