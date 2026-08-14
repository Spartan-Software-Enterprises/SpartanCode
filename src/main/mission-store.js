const fs = require("fs");
const path = require("path");
const { createCollaborationStore } = require("./collaboration");

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
    executionMode: "guided",
    defaultAgent: "leo",
    apiProvider: "local",
  },
  connections: [],
  auditLog: [],
  chat: [],
  collaborationSessions: [],
});

function createMissionStore(filePath) {
  let state = emptyState();
  let sequence = 0;

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
    "executionMode",
    "defaultAgent",
    "apiProvider",
  ]);
  const createId = (prefix) => `${prefix}-${Date.now()}-${sequence++}`;
  const collaboration = createCollaborationStore({
    initialSessions: Array.isArray(state.collaborationSessions)
      ? state.collaborationSessions
      : [],
    persist(sessions) {
      state.collaborationSessions = sessions;
      persist();
    },
  });
  const recordCollaborationAudit = (action, session, details = {}) => {
    state.auditLog.unshift({
      action,
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      ...details,
    });
    state.auditLog = state.auditLog.slice(0, 100);
    persist();
  };

  return {
    snapshot() {
      return JSON.parse(JSON.stringify(state));
    },
    addMission(description) {
      const mission = {
        id: createId("mission"),
        description,
        status: "planning",
        createdAt: new Date().toISOString(),
        plan: null,
      };
      state.missions.unshift(mission);
      state.activity.unshift({
        id: createId("activity"),
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
        id: createId("artifact"),
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
      if (!["accepted", "rejected"].includes(decision))
        throw new Error("Artifact decision must be accepted or rejected");
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
        id: createId("message"),
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
        id: createId("activity"),
        createdAt: new Date().toISOString(),
        ...activity,
      });
      state.activity = state.activity.slice(0, 30);
      persist();
    },
    requestApproval(approval) {
      const saved = {
        id: createId("approval"),
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
      if (!["approved", "denied"].includes(decision))
        throw new Error("Approval decision must be approved or denied");
      approval.status = decision === "approved" ? "approved" : "denied";
      approval.resolvedAt = new Date().toISOString();
      state.auditLog.unshift({
        action: `approval:${decision}`,
        approvalId: id,
        missionId: approval.missionId,
        timestamp: approval.resolvedAt,
      });
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
      if (
        safeUpdate.executionMode !== undefined &&
        !["guided", "yolo"].includes(safeUpdate.executionMode)
      )
        delete safeUpdate.executionMode;
      state.settings = { ...state.settings, ...safeUpdate };
      persist();
      return state.settings;
    },
    addConnection(connection) {
      const saved = {
        id: createId("connection"),
        createdAt: new Date().toISOString(),
        ...connection,
      };
      state.connections.unshift(saved);
      persist();
      return saved;
    },
    collaborationList() {
      return collaboration.list();
    },
    collaborationCreate(input) {
      const session = collaboration.create(input);
      recordCollaborationAudit("collaboration:created", session);
      return session;
    },
    collaborationJoin(id, input) {
      const session = collaboration.join(id, input);
      recordCollaborationAudit("collaboration:participant-joined", session, {
        participantId: input?.participantId,
      });
      return session;
    },
    collaborationAppend(id, event, options) {
      const session = collaboration.append(id, event, options);
      recordCollaborationAudit("collaboration:event-appended", session, {
        eventId: event?.eventId,
        eventType: event?.type,
      });
      return session;
    },
    collaborationMerge(id, events, options) {
      const session = collaboration.merge(id, events, options);
      recordCollaborationAudit("collaboration:events-merged", session, {
        eventCount: Array.isArray(events) ? events.length : 0,
      });
      return session;
    },
  };
}

module.exports = { createMissionStore };
