const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createCustomizationsHub } = require("./customizations-hub");

test("customizations hub discovers workspace rules and skills with progressive disclosure", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spartan-cust-"));
  try {
    fs.writeFileSync(
      path.join(tempDir, "AGENTS.md"),
      "---\nname: Spartan Directives\ndescription: Global rules\n---\nRule content here.",
    );

    const skillsDir = path.join(tempDir, "skills", "code-review");
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillsDir, "SKILL.md"),
      "---\nname: code-review\ndescription: Automated code review guide\n---\nReview steps here.",
    );

    const hub = createCustomizationsHub(tempDir);
    const rules = hub.discoverRules();
    assert.strictEqual(rules.length, 1);
    assert.strictEqual(rules[0].name, "Spartan Directives");
    assert.strictEqual(rules[0].summary, "Rule content here.");

    const skills = hub.discoverSkills();
    assert.strictEqual(skills.length, 1);
    assert.strictEqual(skills[0].id, "code-review");
    assert.strictEqual(skills[0].summary, "Review steps here.");

    const all = hub.getAllCustomizations();
    assert.strictEqual(all.rules.length, 1);
    assert.strictEqual(all.skills.length, 1);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("customizations hub supports in-memory rule and skill registration", () => {
  const hub = createCustomizationsHub();
  const rule = hub.addCustomRule({
    id: "safe-coding",
    name: "Safe Coding",
    description: "Enforces input sanitation",
    content: "Always sanitize input strings.",
  });
  assert.strictEqual(rule.id, "safe-coding");

  const rules = hub.discoverRules();
  assert.strictEqual(rules.length, 1);
  assert.strictEqual(rules[0].id, "safe-coding");

  const skill = hub.addCustomSkill({
    id: "deploy-runbook",
    name: "Deploy Runbook",
    description: "Deployment steps",
    content: "Step 1: check git status",
  });
  assert.strictEqual(skill.id, "deploy-runbook");
  assert.strictEqual(hub.discoverSkills().length, 1);
});
