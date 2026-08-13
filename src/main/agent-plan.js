function createExecutionPlan(description) {
  const goal = String(description || "").trim();
  return {
    goal,
    stages: [
      {
        id: "plan",
        agent: "Plan",
        action: "Understand requirements and define system design",
        status: "ready",
      },
      {
        id: "build",
        agent: "Build",
        action: "Implement the smallest complete solution",
        status: "queued",
      },
      {
        id: "verify",
        agent: "Verify",
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
