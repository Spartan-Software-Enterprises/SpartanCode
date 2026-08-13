const fs = require("fs");
const path = require("path");

const emptyState = () => ({
  missions: [],
  artifacts: [],
  activity: [],
  approvals: [],
  settings: {
    model: "Qwen3-1.7B",
    quantization: "Q4_K_M",
    protocol: "MCP Lite",
    workspacePath: null,
    voiceEnabled: false,
  },
  connections: [],
  auditLog: [],
  chat: [],
});

function createMissionStore(filePath) {
  let state = emptyState();

  try {
    state = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const persist = () => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  };
  const allowedSettings = new Set([
    "model",
    "quantization",
    "protocol",
    "workspacePath",
    "voiceEnabled",
  ]);

  return {
    snapshot() {
      return JSON.parse(JSON.stringify(state));
    },
    addMission(description) {
      const mission = {
        id: `mission-${Date.now()}`,
        description,
        status: "planning",
        createdAt: new Date().toISOString(),
        plan: null,
      };
      state.missions.unshift(mission);
      state.activity.unshift({
        id: `activity-${Date.now()}`,
        agent: "Plan agent",
        message: "Mission received; preparing an execution plan",
        createdAt: mission.createdAt,
      });
      persist();
      return mission;
    },
    addMissionPlan(id, plan) {
      const mission = state.missions.find((item) => item.id === id);
      if (!mission) return null;
      mission.plan = plan;
      persist();
      return mission;
    },
    updateMission(id, update) {
      const mission = state.missions.find((item) => item.id === id);
      if (!mission) return null;
      Object.assign(mission, update);
      persist();
      return mission;
    },
    addArtifact(artifact) {
      const saved = {
        id: `artifact-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...artifact,
      };
      state.artifacts.unshift(saved);
      persist();
      return saved;
    },
    getArtifact(id) {
      return state.artifacts.find((item) => item.id === id) || null;
    },
    updateArtifact(id, update) {
      const artifact = state.artifacts.find((item) => item.id === id);
      if (!artifact) return null;
      Object.assign(artifact, update);
      persist();
      return artifact;
    },
    reviewArtifact(id, decision, note = "") {
      const artifact = state.artifacts.find((item) => item.id === id);
      if (!artifact) return null;
      artifact.review = {
        decision,
        note,
        reviewedAt: new Date().toISOString(),
      };
      state.auditLog.unshift({
        action: `artifact:${decision}`,
        artifactId: id,
        note,
        timestamp: artifact.review.reviewedAt,
      });
      persist();
      return artifact;
    },
    auditLog() {
      return state.auditLog.slice(0, 100);
    },
    addChatMessage(role, content) {
      const message = {
        id: `message-${Date.now()}-${state.chat.length}`,
        role,
        content,
        createdAt: new Date().toISOString(),
      };
      state.chat.push(message);
      state.chat = state.chat.slice(-100);
      persist();
      return message;
    },
    chatMessages() {
      return state.chat.slice();
    },
    addActivity(activity) {
      state.activity.unshift({
        id: `activity-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...activity,
      });
      state.activity = state.activity.slice(0, 30);
      persist();
    },
    requestApproval(approval) {
      const saved = {
        id: `approval-${Date.now()}`,
        status: "pending",
        createdAt: new Date().toISOString(),
        ...approval,
      };
      state.approvals.unshift(saved);
      persist();
      return saved;
    },
    resolveApproval(id, decision) {
      const approval = state.approvals.find((item) => item.id === id);
      if (!approval) return null;
      approval.status = decision === "approved" ? "approved" : "denied";
      approval.resolvedAt = new Date().toISOString();
      persist();
      return approval;
    },
    clearMissions() {
      state.missions = [];
      state.artifacts = [];
      state.activity = [];
      state.approvals = [];
      persist();
    },
    updateSettings(update) {
      const safeUpdate = Object.fromEntries(
        Object.entries(update || {}).filter(([key]) =>
          allowedSettings.has(key),
        ),
      );
      state.settings = { ...state.settings, ...safeUpdate };
      persist();
      return state.settings;
    },
    addConnection(connection) {
      const saved = {
        id: `connection-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...connection,
      };
      state.connections.unshift(saved);
      persist();
      return saved;
    },
  };
}

module.exports = { createMissionStore };
