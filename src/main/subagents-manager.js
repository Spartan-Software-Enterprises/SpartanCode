const crypto = require("node:crypto");

const DEFAULT_SUBAGENTS = [
  {
    type: "planner",
    name: "Plan Architect",
    role: "System Architect",
    description:
      "Breaks down requirements, designs architecture, and produces structured execution plans.",
    prompt:
      "You are the Plan Architect. Break down missions into concrete, verifiable steps.",
    model: "inherit",
    capabilities: ["read", "search", "plan"],
  },
  {
    type: "engineer",
    name: "Build Engineer",
    role: "Software Engineer",
    description:
      "Implements features, writes clean code, handles refactoring, and applies localized edits.",
    prompt:
      "You are the Build Engineer. Write tested, maintainable code adhering to project guidelines.",
    model: "inherit",
    capabilities: ["read", "write", "edit", "terminal"],
  },
  {
    type: "verifier",
    name: "QA Verifier",
    role: "QA Specialist",
    description:
      "Runs tests, linters, formatting, and verifies regressions across all platforms.",
    prompt:
      "You are the QA Verifier. Ensure code passes all baseline and platform verification gates.",
    model: "inherit",
    capabilities: ["read", "terminal", "test"],
  },
  {
    type: "security",
    name: "Security Auditor",
    role: "Security Specialist",
    description:
      "Scans for secret leakage, boundary escapes, insecure permissions, and policy violations.",
    prompt:
      "You are the Security Auditor. Ensure workspace boundary integrity and zero secret leakage.",
    model: "inherit",
    capabilities: ["read", "audit", "policy"],
  },
  {
    type: "researcher",
    name: "Codebase Explorer",
    role: "Research Specialist",
    description:
      "Explores the codebase, searches symbols, inspects dependencies, and synthesizes context.",
    prompt:
      "You are the Codebase Explorer. Survey the repository and extract precise context.",
    model: "inherit",
    capabilities: ["read", "search", "grep"],
  },
];

class SubagentsManager {
  constructor() {
    this.subagents = new Map();
    this.messages = new Map();
  }

  listAvailableTemplates() {
    return DEFAULT_SUBAGENTS.map((t) => ({ ...t }));
  }

  spawnSubagent({ type, role, prompt, name, model = "inherit" }) {
    const template = DEFAULT_SUBAGENTS.find((t) => t.type === type) || {};
    const conversationId = crypto.randomUUID();
    const subagent = {
      conversationId,
      type: type || "custom",
      name: name || template.name || `Subagent-${conversationId.slice(0, 6)}`,
      role: role || template.role || "Specialist",
      description: template.description || "Custom spawned subagent",
      prompt: prompt || template.prompt || "",
      model,
      state: "running",
      stateDetail: "Initialized and ready",
      createdAt: new Date().toISOString(),
      stepIndex: 0,
      transcript: [],
    };
    this.subagents.set(conversationId, subagent);
    this.messages.set(conversationId, []);
    return subagent;
  }

  getSubagent(conversationId) {
    return this.subagents.get(conversationId) || null;
  }

  listSubagents() {
    return Array.from(this.subagents.values()).map((agent) => ({ ...agent }));
  }

  sendMessage(recipientId, messageContent, senderId = "parent") {
    const subagent = this.subagents.get(recipientId);
    if (!subagent) {
      throw new Error(`Subagent not found: ${recipientId}`);
    }
    const message = {
      id: crypto.randomUUID(),
      senderId,
      recipientId,
      content: String(messageContent).slice(0, 10000),
      timestamp: new Date().toISOString(),
    };
    const list = this.messages.get(recipientId) || [];
    list.push(message);
    this.messages.set(recipientId, list);

    subagent.stepIndex += 1;
    subagent.transcript.push({
      step: subagent.stepIndex,
      type: "MESSAGE_RECEIVED",
      sender: senderId,
      content: message.content,
      timestamp: message.timestamp,
    });
    subagent.state = "running";
    subagent.stateDetail = `Processing message from ${senderId}`;
    return message;
  }

  getTranscript(conversationId) {
    const subagent = this.subagents.get(conversationId);
    if (!subagent) return [];
    return subagent.transcript || [];
  }

  updateState(conversationId, state, stateDetail = "") {
    const subagent = this.subagents.get(conversationId);
    if (!subagent) throw new Error(`Subagent not found: ${conversationId}`);
    const validStates = [
      "running",
      "idle",
      "waiting_for_input",
      "waiting_for_approval",
      "done",
      "errored",
    ];
    if (!validStates.includes(state)) {
      throw new Error(`Invalid subagent state: ${state}`);
    }
    subagent.state = state;
    subagent.stateDetail = String(stateDetail).slice(0, 500);
    return subagent;
  }

  killSubagent(conversationId) {
    const subagent = this.subagents.get(conversationId);
    if (!subagent) return false;
    subagent.state = "done";
    subagent.stateDetail = "Terminated by operator";
    return true;
  }

  killAll() {
    let count = 0;
    for (const subagent of this.subagents.values()) {
      if (subagent.state !== "done") {
        subagent.state = "done";
        subagent.stateDetail = "Terminated by operator";
        count++;
      }
    }
    return count;
  }
}

function createSubagentsManager() {
  return new SubagentsManager();
}

module.exports = {
  DEFAULT_SUBAGENTS,
  SubagentsManager,
  createSubagentsManager,
};
