import { gitRoute, normalizeGitOutput, validateGitCommitMessage } from "./git";

describe("Android remote Git client", () => {
  it("maps only supported operations to bridge routes", () => {
    expect(gitRoute("status")).toBe("/v1/git/status");
    expect(gitRoute("diff")).toBe("/v1/git/diff");
    expect(gitRoute("stage")).toBe("/v1/git/stage");
    expect(gitRoute("commit")).toBe("/v1/git/commit");
  });

  it("bounds commit messages", () => {
    expect(validateGitCommitMessage("  Android commit  ")).toBe(
      "Android commit",
    );
    expect(() => validateGitCommitMessage(" ")).toThrow(
      "Commit message is required",
    );
    expect(() => validateGitCommitMessage("x".repeat(73))).toThrow(
      "Commit message is too long",
    );
  });

  it("normalizes bounded bridge output", () => {
    expect(normalizeGitOutput({ output: "clean" })).toBe("clean");
    expect(normalizeGitOutput({ output: "x".repeat(50_001) })).toHaveLength(
      50_000,
    );
    expect(normalizeGitOutput({ output: 42 })).toBe("");
  });
});
