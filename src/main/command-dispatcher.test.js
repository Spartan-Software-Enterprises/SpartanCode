const test = require("node:test");
const assert = require("node:assert");
const {
  createCommandDispatcher,
  SLASH_COMMANDS,
} = require("./command-dispatcher");
const { createSubagentsManager } = require("./subagents-manager");
const { createCustomizationsHub } = require("./customizations-hub");

test("command dispatcher resolves slash commands", () => {
  const dispatcher = createCommandDispatcher();
  const commands = dispatcher.listSlashCommands();
  assert.ok(Array.isArray(commands));
  assert.ok(commands.length >= 10);

  const resolvedPlan = dispatcher.resolveSlashCommand(
    "/plan design microservices",
  );
  assert.strictEqual(resolvedPlan.matched, true);
  assert.strictEqual(resolvedPlan.command, "/plan");
  assert.strictEqual(resolvedPlan.mode, "architect");
  assert.strictEqual(resolvedPlan.args, "design microservices");

  const unknown = dispatcher.resolveSlashCommand("/unknown123");
  assert.strictEqual(unknown.matched, false);
  assert.ok(unknown.error);

  assert.strictEqual(
    dispatcher.resolveSlashCommand("plain text message"),
    null,
  );
});

test("command dispatcher resolves @ mentions to rules, skills, and subagents", () => {
  const subagentsManager = createSubagentsManager();
  subagentsManager.spawnSubagent({ type: "planner", name: "ArchitectAlpha" });

  const customizationsHub = createCustomizationsHub();
  customizationsHub.addCustomRule({
    id: "strict-lint",
    name: "Strict Linting",
    content: "Lint before committing",
  });

  const dispatcher = createCommandDispatcher({
    subagentsManager,
    customizationsHub,
  });
  const mentions = dispatcher.resolveMentions(
    "Please ask @ArchitectAlpha to check @strict-lint",
  );

  assert.strictEqual(mentions.length, 2);
  assert.strictEqual(mentions[0].resolved.type, "subagent");
  assert.strictEqual(mentions[0].resolved.name, "ArchitectAlpha");

  assert.strictEqual(mentions[1].resolved.type, "rule");
  assert.strictEqual(mentions[1].resolved.name, "Strict Linting");
});
