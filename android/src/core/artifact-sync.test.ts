import { mergeArtifactSets } from "./artifact-sync";

const artifact = (content: string) => ({
  id: "artifact-1",
  name: "README",
  type: "text",
  content,
});

describe("artifact sync", () => {
  it("applies a non-conflicting local change", () => {
    const result = mergeArtifactSets({
      base: [artifact("base")],
      local: [artifact("local")],
      remote: [artifact("base")],
    });
    expect(result.merged).toEqual([artifact("local")]);
    expect(result.requiresReview).toBe(false);
  });

  it("keeps the local value and returns divergent edits for review", () => {
    const result = mergeArtifactSets({
      base: [artifact("base")],
      local: [artifact("phone")],
      remote: [artifact("server")],
    });
    expect(result.requiresReview).toBe(true);
    expect(result.conflicts[0]?.remote?.content).toBe("server");
  });
});
