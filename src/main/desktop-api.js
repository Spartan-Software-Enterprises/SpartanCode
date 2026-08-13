const { ipcMain, dialog } = require("electron");
const { getRuntimeStatus } = require("./runtime-status");
const { gitStatusAt, gitInitAt, gitAddAt, gitCommitAt } = require("./git");
const { listLicensedModels } = require("./model-catalog");
const { classifyCommand } = require("./policy-engine");
const { getCapabilities } = require("./capabilities");
const { getProviderStatus } = require("./provider-status");
const { createVoiceService } = require("./voice-service");
const { createExecutionPlan } = require("./agent-plan");
const { createCoreMcpRegistry } = require("./mcp-lite");
const { listWorkspaceFiles, readWorkspaceFile } = require("./workspace-tools");
const { createModelCache } = require("./model-cache");

function registerDesktopApi({ store, window, runMission, modelCache }) {
  const voiceService = createVoiceService();
  ipcMain.handle("runtime:status", () => getRuntimeStatus());
  ipcMain.handle("capabilities:get", () => getCapabilities());
  ipcMain.handle("providers:get", () => getProviderStatus());
  ipcMain.handle("voice:status", () => voiceService.status());
  ipcMain.handle("voice:start", () => voiceService.start());
  ipcMain.handle("mcp:tools", () => [
    {
      name: "filesystem",
      description: "Read project files inside the approved workspace",
    },
    {
      name: "terminal",
      description: "Run commands through the human-in-the-loop policy",
    },
    { name: "git", description: "Inspect and update project history" },
  ]);
  ipcMain.handle("mcp:dispatch", async (_event, request) => {
    const workspacePath = store.snapshot().settings.workspacePath;
    const registry = createCoreMcpRegistry({
      workspacePath,
      gitStatus: gitStatusAt,
      classifyCommand,
    });
    return registry.dispatch(request);
  });
  ipcMain.handle("models:list", (_event, options) =>
    listLicensedModels(options),
  );
  ipcMain.handle("models:cache", () => modelCache.list());
  ipcMain.handle("models:prepare", (_event, modelId, quantization) =>
    modelCache.prepare(modelId, quantization),
  );
  ipcMain.handle("policy:classify", (_event, command) =>
    classifyCommand(command),
  );
  ipcMain.handle("workspace:list", (_event, requestedPath) => {
    const workspacePath = store.snapshot().settings.workspacePath;
    return listWorkspaceFiles(workspacePath, requestedPath);
  });
  ipcMain.handle("workspace:read", (_event, requestedPath) => {
    const workspacePath = store.snapshot().settings.workspacePath;
    return readWorkspaceFile(workspacePath, requestedPath);
  });
  ipcMain.handle("workspace:snapshot", () => store.snapshot());
  ipcMain.handle("artifact:get", (_event, id) => store.getArtifact(id));
  ipcMain.handle("mission:plan", (_event, description) =>
    createExecutionPlan(description),
  );
  ipcMain.handle("settings:get", () => store.snapshot().settings);
  ipcMain.handle("settings:update", (_event, update) =>
    store.updateSettings(update),
  );
  ipcMain.handle("connections:list", () => store.snapshot().connections);
  ipcMain.handle("connections:add", (_event, profile) => {
    if (
      !profile ||
      typeof profile.name !== "string" ||
      typeof profile.host !== "string"
    )
      throw new Error("Connection name and host are required");
    return store.addConnection({
      name: profile.name.trim(),
      host: profile.host.trim(),
      transport: profile.transport || "ssh",
      status: "saved",
    });
  });
  ipcMain.handle("connections:validate", (_event, profile) => {
    const transport = profile && profile.transport ? profile.transport : "ssh";
    const valid = Boolean(
      profile && typeof profile.host === "string" && profile.host.trim(),
    );
    return {
      valid,
      transport,
      message: valid
        ? `${transport.toUpperCase()} profile is ready for an approval-gated connection`
        : "A host is required",
    };
  });
  ipcMain.handle("workspace:choose", async () => {
    const result = await dialog.showOpenDialog(window, {
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const settings = store.updateSettings({
      workspacePath: result.filePaths[0],
    });
    window.webContents.send("workspace:changed", store.snapshot());
    return settings.workspacePath;
  });
  ipcMain.handle("git:status", async () => {
    const workspacePath = store.snapshot().settings.workspacePath;
    if (!workspacePath)
      return { available: false, message: "Choose a workspace first" };
    try {
      return { available: true, output: await gitStatusAt(workspacePath) };
    } catch (error) {
      return { available: false, message: error.stderr || error.message };
    }
  });
  ipcMain.handle("git:init", async () => {
    const workspacePath = store.snapshot().settings.workspacePath;
    if (!workspacePath)
      return { available: false, message: "Choose a workspace first" };
    try {
      return { available: true, output: await gitInitAt(workspacePath) };
    } catch (error) {
      return { available: false, message: error.stderr || error.message };
    }
  });
  ipcMain.handle("git:stage", async () => {
    const workspacePath = store.snapshot().settings.workspacePath;
    if (!workspacePath)
      return { available: false, message: "Choose a workspace first" };
    try {
      return { available: true, output: await gitAddAt(workspacePath) };
    } catch (error) {
      return { available: false, message: error.stderr || error.message };
    }
  });
  ipcMain.handle("git:commit", async (_event, message) => {
    const workspacePath = store.snapshot().settings.workspacePath;
    if (!workspacePath)
      return { available: false, message: "Choose a workspace first" };
    if (typeof message !== "string" || !message.trim())
      throw new Error("Commit message is required");
    try {
      return {
        available: true,
        output: await gitCommitAt(workspacePath, message.trim()),
      };
    } catch (error) {
      return { available: false, message: error.stderr || error.message };
    }
  });
  ipcMain.handle("mission:start", (_event, description) => {
    if (typeof description !== "string" || !description.trim()) {
      throw new Error("A mission description is required");
    }
    const normalized = description.trim();
    const dangerous = classifyCommand(normalized).requiresApproval;
    const mission = store.addMission(normalized);
    if (dangerous) {
      const approval = store.requestApproval({
        missionId: mission.id,
        title: "Permission needed before execution",
        detail:
          "This mission may change your system or publish data. Review and approve before the agents continue.",
      });
      store.updateMission(mission.id, {
        status: "awaiting_approval",
        approvalId: approval.id,
      });
    }
    window.webContents.send("workspace:changed", store.snapshot());
    if (!dangerous) runMission(mission);
    return mission;
  });
  ipcMain.handle("approval:resolve", (_event, { approvalId, decision }) => {
    const approval = store.resolveApproval(approvalId, decision);
    if (!approval) throw new Error("Approval request was not found");
    const mission = store
      .snapshot()
      .missions.find((item) => item.id === approval.missionId);
    if (mission && decision === "approved") {
      store.updateMission(mission.id, { status: "planning" });
      runMission(mission);
    } else if (mission) {
      store.updateMission(mission.id, { status: "denied" });
      store.addActivity({
        agent: "Policy engine",
        message: "Mission stopped by user approval decision",
      });
    }
    window.webContents.send("workspace:changed", store.snapshot());
    return approval;
  });
  ipcMain.handle("missions:clear", () => {
    store.clearMissions();
    window.webContents.send("workspace:changed", store.snapshot());
    return store.snapshot();
  });
}

module.exports = { registerDesktopApi };
