import {
  DEFAULT_ANDROID_SUBAGENTS,
  spawnAndroidSubagent,
} from "./subagents";

describe("Android Subagents", () => {
  it("provides default subagent templates", () => {
    expect(DEFAULT_ANDROID_SUBAGENTS.length).toBeGreaterThanOrEqual(4);
    const types = DEFAULT_ANDROID_SUBAGENTS.map((s) => s.type);
    expect(types).toContain("planner");
    expect(types).toContain("engineer");
    expect(types).toContain("verifier");
  });

  it("spawns subagent instances with unique conversation IDs and running state", () => {
    const instance = spawnAndroidSubagent("engineer", "Custom Builder");
    expect(instance.conversationId).toMatch(/^sub-/);
    expect(instance.name).toBe("Custom Builder");
    expect(instance.role).toBe("Software Engineer");
    expect(instance.state).toBe("running");
  });
});
