const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { loadCustomAgents, parseFrontmatter } = require("./custom-agents");

test("custom agent frontmatter exposes scoped metadata and prompt", () => {
  const result = parseFrontmatter(
    "---\nname: researcher\ndescription: Research specialist\ntools:\n  - workspace.read\nsubagent: true\n---\n\nResearch carefully.",
  );
  assert.deepEqual(result.metadata.tools, ["workspace.read"]);
  assert.equal(result.metadata.subagent, true);
  assert.equal(result.prompt, "Research carefully.");
});

test("workspace custom agents are discovered and invalid definitions are ignored", () => {
  const workspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-agents-"),
  );
  const agents = path.join(workspace, ".agents", "agents");
  fs.mkdirSync(path.join(agents, "researcher"), { recursive: true });
  fs.writeFileSync(
    path.join(agents, "researcher", "agent.md"),
    "---\nname: researcher\ndescription: Research specialist\nmodel: flash\n---\nInvestigate.",
  );
  fs.writeFileSync(path.join(agents, "broken.md"), "not frontmatter");
  assert.deepEqual(
    loadCustomAgents(workspace).map((agent) => agent.name),
    ["researcher"],
  );
  fs.rmSync(workspace, { recursive: true, force: true });
});
