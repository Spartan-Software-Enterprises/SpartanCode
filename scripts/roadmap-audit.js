const fs = require("node:fs");
const path = require("node:path");

const ROADMAP_PATH = path.resolve(__dirname, "../docs/ROADMAP_MATRIX.md");
const ROW_PATTERN =
  /^\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(Implemented|Partial|Open)\s*\|/;

function auditRoadmap(markdown) {
  const rows = String(markdown)
    .split(/\r?\n/)
    .map((line) => line.match(ROW_PATTERN))
    .filter(Boolean)
    .map((match) => ({
      id: Number(match[1]),
      feature: match[2],
      status: match[3],
    }));
  const expectedIds = Array.from({ length: 35 }, (_, index) => index + 1);
  const ids = rows.map((row) => row.id);
  if (
    rows.length !== expectedIds.length ||
    ids.some((id, index) => id !== expectedIds[index])
  ) {
    throw new Error(
      "Roadmap matrix must contain exactly ordered rows 1 through 35",
    );
  }
  const counts = { Implemented: 0, Partial: 0, Open: 0 };
  for (const row of rows) counts[row.status] += 1;
  return {
    total: rows.length,
    counts,
    implementedPercent: Math.round((counts.Implemented / rows.length) * 100),
    rows,
  };
}

if (require.main === module) {
  const report = auditRoadmap(fs.readFileSync(ROADMAP_PATH, "utf8"));
  console.log(JSON.stringify(report, null, 2));
}

module.exports = { auditRoadmap };
