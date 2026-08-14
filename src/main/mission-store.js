const fs = require("fs");
const path = require("path");
const { createCollaborationStore } = require("./collaboration");
const {
  DEFAULT_SETTINGS,
  createSettingsHierarchy,
  normalizeSettings,
  normalizeSettingsOverride,
} = require("./settings-hierarchy");

const emptyState = () => ({
  missions: [],
  artifacts: [],
  activity: [],
  approvals: [],
  settings: { ...DEFAULT_SETTINGS, workspacePath: null },
  settingsScopes: { global: {}, project: {}, agent: {}, session: {} },
  connections: [],
  auditLog: [],
  chat: [],
  collaborationSessions: [],
});

function createMissionStore(filePath) {
  let state = emptyState();
  let sequence = 0;

  const backupPath = `${filePath}.bak`;
  const readState = (candidatePath) => {
    try {
      const parsed = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        return null;
      return parsed;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      if (error instanceof SyntaxError) return null;
      throw error;
    }
  };
  const primaryState = readState(filePath);
  const backupState = readState(backupPath);
  state = primaryState || backupState || emptyState();
  if (!primaryState && backupState) {
    fs.copyFileSync(backupPath, filePath);
  }

  const persist = () => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(state, null, 2));
    try {
      fs.copyFileSync(filePath, backupPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    fs.renameSync(temporaryPath, filePath);
  };
  const allowedSettings = new Set([
    ...Object.keys(DEFAULT_SETTINGS),
    "workspacePath",
  ]);
  state.settings = {
    ...normalizeSettings(state.settings),
    workspacePath:
      typeof state.settings?.workspacePath === "string"
        ? state.settings.workspacePath
        : null,
  };
  if (!state.settingsScopes || typeof state.settingsScopes !== "object")
    state.settingsScopes = { global: {}, project: {}, agent: {}, session: {} };
  const settingsHierarchy = createSettingsHierarchy({
    baseSettings: state.settings,
    layers: state.settingsScopes,
    allowedKeys: allowedSettings,
  });
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
      const snapshot = JSON.parse(JSON.stringify(state));
      snapshot.settingsScopes = settingsHierarchy.snapshot();
      return snapshot;
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
        Object.entries(normalizeSettingsOverride(update)).filter(([key]) =>
          allowedSettings.has(key),
        ),
      );
      if (Object.prototype.hasOwnProperty.call(update || {}, "workspacePath"))
        safeUpdate.workspacePath =
          typeof update.workspacePath === "string"
            ? update.workspacePath
            : null;
      state.settings = { ...state.settings, ...safeUpdate };
      settingsHierarchy.set("global", "default", safeUpdate);
      persist();
      return state.settings;
    },
    updateScopedSettings(scope, id, update) {
      const values = settingsHierarchy.set(scope, id, update);
      if (scope === "global") state.settings = { ...state.settings, ...values };
      state.settingsScopes = settingsHierarchy.snapshot();
      persist();
      return values;
    },
    resolveSettings(context) {
      return settingsHierarchy.resolve(context);
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
