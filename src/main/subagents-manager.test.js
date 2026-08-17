const test = require("node:test");
const assert = require("node:assert");
const {
  createSubagentsManager,
  DEFAULT_SUBAGENTS,
} = require("./subagents-manager");

test("subagents manager lists available default templates", () => {
  const manager = createSubagentsManager();
  const templates = manager.listAvailableTemplates();
  assert.ok(Array.isArray(templates));
  assert.strictEqual(templates.length, 5);
  const types = templates.map((t) => t.type);
  assert.ok(types.includes("planner"));
  assert.ok(types.includes("engineer"));
  assert.ok(types.includes("verifier"));
  assert.ok(types.includes("security"));
  assert.ok(types.includes("researcher"));
});

test("subagents manager spawns a specialized subagent and tracks state", () => {
  const manager = createSubagentsManager();
  const subagent = manager.spawnSubagent({
    type: "planner",
    role: "Lead Architect",
    prompt: "Design the database schema",
  });
  assert.ok(subagent.conversationId);
  assert.strictEqual(subagent.type, "planner");
  assert.strictEqual(subagent.role, "Lead Architect");
  assert.strictEqual(subagent.state, "running");

  const fetched = manager.getSubagent(subagent.conversationId);
  assert.strictEqual(fetched.conversationId, subagent.conversationId);

  const list = manager.listSubagents();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].conversationId, subagent.conversationId);
});

test("subagents manager handles messaging, step index, and state updates", () => {
  const manager = createSubagentsManager();
  const subagent = manager.spawnSubagent({ type: "engineer" });
  const msg = manager.sendMessage(
    subagent.conversationId,
    "Refactor auth logic",
    "parent-session",
  );
  assert.ok(msg.id);
  assert.strictEqual(msg.recipientId, subagent.conversationId);
  assert.strictEqual(msg.content, "Refactor auth logic");

  const transcript = manager.getTranscript(subagent.conversationId);
  assert.strictEqual(transcript.length, 1);
  assert.strictEqual(transcript[0].type, "MESSAGE_RECEIVED");
  assert.strictEqual(transcript[0].step, 1);

  manager.updateState(subagent.conversationId, "idle", "Awaiting next task");
  assert.strictEqual(
    manager.getSubagent(subagent.conversationId).state,
    "idle",
  );

  manager.killSubagent(subagent.conversationId);
  assert.strictEqual(
    manager.getSubagent(subagent.conversationId).state,
    "done",
  );
});
