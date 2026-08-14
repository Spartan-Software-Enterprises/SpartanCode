const { listBundledAgents, loadCustomAgents } = require("./custom-agents");

function createExecutionPlan(
  description,
  { workspacePath, defaultAgent = "leo" } = {},
) {
  const goal = String(description || "").trim();
  const customAgents = [
    ...listBundledAgents(),
    ...loadCustomAgents(workspacePath),
  ];
  return {
    goal,
    defaultAgent,
    commander: "leo",
    customAgents: customAgents.map(({ prompt, ...agent }) => agent),
    stages: [
      {
        id: "plan",
        agent: "Plan",
        agentId: "plan",
        action: "Understand requirements and define system design",
        status: "ready",
        commander: "leo",
      },
      {
        id: "build",
        agent: "Build",
        agentId: "build",
        action: "Implement the smallest complete solution",
        status: "queued",
        commander: "leo",
      },
      {
        id: "verify",
        agent: "Verify",
        agentId: "verify",
        action: "Run tests, security checks, and performance checks",
        status: "queued",
        commander: "leo",
      },
    ],
    assumptions: [
      "Changes remain inside the selected workspace",
      "External mutations require approval",
    ],
  };
}

module.exports = { createExecutionPlan };
