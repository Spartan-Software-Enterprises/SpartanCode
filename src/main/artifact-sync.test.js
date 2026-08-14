const assert = require("assert");
const test = require("node:test");
const { mergeArtifactSets } = require("./artifact-sync");

const artifact = (content) => ({
  id: "artifact-1",
  name: "README",
  type: "text",
  content,
});

test("artifact sync applies non-conflicting three-way changes", () => {
  const result = mergeArtifactSets({
    base: [artifact("base")],
    local: [artifact("local")],
    remote: [artifact("base")],
  });
  assert.deepEqual(result.merged, [artifact("local")]);
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.requiresReview, false);
});

test("artifact sync reports divergent edits without overwriting them", () => {
  const result = mergeArtifactSets({
    base: [artifact("base")],
    local: [artifact("phone")],
    remote: [artifact("server")],
  });
  assert.equal(result.requiresReview, true);
  assert.equal(result.conflicts[0].id, "artifact-1");
  assert.equal(result.merged[0].content, "phone");
  assert.equal(result.conflicts[0].remote.content, "server");
});

test("artifact sync handles independent additions and bounded input", () => {
  const result = mergeArtifactSets({
    base: [],
    local: [artifact("phone")],
    remote: [{ ...artifact("server"), id: "artifact-2" }],
  });
  assert.equal(result.merged.length, 2);
  assert.throws(
    () => mergeArtifactSets({ local: new Array(501).fill(artifact("x")) }),
    /at most 500/,
  );
});

test("artifact sync rejects duplicate ids instead of silently discarding an artifact", () => {
  assert.throws(
    () =>
      mergeArtifactSets({
        local: [artifact("first"), { ...artifact("second"), name: "Other" }],
      }),
    /Artifact ids must be unique: artifact-1/,
  );
});
