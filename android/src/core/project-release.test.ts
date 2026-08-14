import {
  createMobileProject,
  isReleaseReady,
  normalizeProject,
  setReleaseCheck,
} from "./project-release";

describe("mobile-only project and release planning", () => {
  it("creates a target-independent project without a bridge", () => {
    const project = createMobileProject(
      "Field service dashboard",
      "Build a releaseable product",
      "windows",
      "2026-08-14T00:00:00.000Z",
      "project-1",
    );
    expect(project.target).toBe("windows");
    expect(project.releaseStatus).toBe("planning");
    expect(project.checks.plan).toBe(true);
  });

  it("only reports ready after every release gate is explicitly checked", () => {
    let project = createMobileProject("App", "", "custom", undefined, "p");
    expect(isReleaseReady(project.checks)).toBe(false);
    for (const check of ["build", "verify", "package"] as const)
      project = setReleaseCheck(project, check);
    expect(project.releaseStatus).toBe("ready");
  });

  it("rejects malformed persisted projects", () => {
    expect(normalizeProject({ id: "bad", target: "unsupported" })).toBeNull();
  });
});
