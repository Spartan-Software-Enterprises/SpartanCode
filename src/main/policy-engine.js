const dangerousPatterns = [
  {
    pattern: /\b(deploy|publish|push)\b/i,
    reason: "publishes changes outside the local workspace",
  },
  { pattern: /\b(delete|remove|rm)\b/i, reason: "can remove files or data" },
  {
    pattern: /\b(install|sudo|credential|secret|token)\b/i,
    reason: "can change system state or expose sensitive data",
  },
];

function classifyCommand(command) {
  const normalized = String(command || "").trim();
  const match = dangerousPatterns.find((item) => item.pattern.test(normalized));
  return {
    command: normalized,
    requiresApproval: Boolean(match),
    reason: match ? match.reason : "read-only or local command",
  };
}

function requiresMissionApproval(command, executionMode = "guided") {
  return executionMode !== "yolo" && classifyCommand(command).requiresApproval;
}

module.exports = { classifyCommand, requiresMissionApproval };
