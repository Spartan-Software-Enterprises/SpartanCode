const { loadCustomAgents } = require("./custom-agents");

function createExecutionPlan(description, { workspacePath } = {}) {
  const goal = String(description || "").trim();
  const customAgents = loadCustomAgents(workspacePath);
  return {
    goal,
    customAgents: customAgents.map(({ prompt, ...agent }) => agent),
    stages: [
      {
        id: "plan",
        agent: "Plan",
        agentId: "plan",
        action: "Understand requirements and define system design",
        status: "ready",
      },
      {
        id: "build",
        agent: "Build",
        agentId: "build",
        action: "Implement the smallest complete solution",
        status: "queued",
      },
      {
        id: "verify",
        agent: "Verify",
        agentId: "verify",
        action: "Run tests, security checks, and performance checks",
        status: "queued",
      },
    ],
    assumptions: [
      "Changes remain inside the selected workspace",
      "External mutations require approval",
    ],
  };
}

module.exports = { createExecutionPlan };
