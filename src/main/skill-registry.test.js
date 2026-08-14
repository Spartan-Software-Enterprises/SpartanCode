const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  discoverSkills,
  listExternalSkillSources,
  loadSkill,
} = require("./skill-registry");

test("external skill source lock records all three repositories", () => {
  const sources = listExternalSkillSources();
  assert.deepEqual(
    sources.map((source) => source.id),
    [
      "anthropic-cybersecurity-skills",
      "antigravity-skills",
      "antigravity-awesome-skills",
    ],
  );
  assert.ok(sources.every((source) => /^[0-9a-f]{40}$/.test(source.commit)));
});

test("skill registry indexes metadata without enabling executable content", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-skills-"));
  const skillDir = path.join(root, "sample");
  fs.mkdirSync(skillDir);
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    "---\nname: sample-review\ndescription: Review source safely\nlicense: MIT\n---\n# Review\n",
  );
  const [skill] = discoverSkills([root]);
  assert.equal(skill.risk, "general");
  assert.equal(skill.executableContent, false);
  assert.match(loadSkill(skill).content, /# Review/);
});

test("skill registry marks offensive and secret-handling skills for review", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-skills-risk-"),
  );
  const skillDir = path.join(root, "sample");
  fs.mkdirSync(skillDir);
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    "---\nname: credential-audit\ndescription: Analyze credential access and exploit paths\n---\n",
  );
  assert.equal(discoverSkills([root])[0].risk, "review-required");
});
