const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { auditRoadmap } = require("./roadmap-audit");

test("roadmap audit covers the complete numbered matrix", () => {
  const markdown = fs.readFileSync(
    path.resolve(__dirname, "../docs/ROADMAP_MATRIX.md"),
    "utf8",
  );
  const report = auditRoadmap(markdown);
  assert.equal(report.total, 35);
  assert.deepEqual(report.counts, { Implemented: 20, Partial: 15, Open: 0 });
  assert.equal(report.implementedPercent, 57);
});

test("roadmap audit rejects missing or reordered rows", () => {
  assert.throws(
    () => auditRoadmap("| 1 | MCP Lite | Implemented | evidence |"),
    /ordered rows/,
  );
});
