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
      persist();
    },
    updateSettings(update) {
      state.settings = { ...state.settings, ...update };
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
