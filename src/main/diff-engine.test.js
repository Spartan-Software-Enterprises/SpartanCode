const test = require("node:test");
const assert = require("node:assert");
const { computeLineDiff } = require("./diff-engine");

test("diff engine computes line additions and deletions", () => {
  const oldCode = "function hello() {\n  return 'old';\n}";
  const newCode = "function hello() {\n  return 'new';\n}";

  const diff = computeLineDiff(oldCode, newCode);
  assert.strictEqual(diff.isEqual, false);
  assert.strictEqual(diff.additions, 1);
  assert.strictEqual(diff.deletions, 1);
  assert.ok(diff.unified.includes("-   return 'old';"));
  assert.ok(diff.unified.includes("+   return 'new';"));
});

test("diff engine detects identical content", () => {
  const code = "console.log('identical');";
  const diff = computeLineDiff(code, code);
  assert.strictEqual(diff.isEqual, true);
  assert.strictEqual(diff.additions, 0);
  assert.strictEqual(diff.deletions, 0);
});
