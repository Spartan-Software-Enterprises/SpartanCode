const { ipcMain, dialog } = require("electron");
const { getRuntimeStatus } = require("./runtime-status");
const { gitStatusAt, gitInitAt, gitAddAt, gitCommitAt } = require("./git");
const {
  listLicensedModels,
  searchHuggingFaceModels,
} = require("./model-catalog");
const { classifyCommand, requiresMissionApproval } = require("./policy-engine");
const { getCapabilities } = require("./capabilities");
const { getProviderStatus } = require("./provider-status");
const { createVoiceService } = require("./voice-service");
const { createChatService } = require("./chat-service");
const { createExecutionPlan } = require("./agent-plan");
const { createCoreMcpRegistry } = require("./mcp-lite");
const { listWorkspaceFiles, readWorkspaceFile } = require("./workspace-tools");
const { createModelCache } = require("./model-cache");
const { validateRemoteConfig } = require("./remote-connection");
const { loadCustomAgents } = require("./custom-agents");
const { createRuntimeRegistry } = require("./runtime-adapters");
const { listPlugins } = require("./plugin-registry");
const { fetchMarketplaceIndex } = require("./plugin-marketplace");
const { exportAuditLog } = require("./audit-export");
const {
  estimateServerCost,
  getRouterGuidance,
  listServerProviders,
  listServerTemplates,
} = require("./remote-guidance");

function registerDesktopApi({ store, window, runMission, modelCache }) {
  const voiceService = createVoiceService();
  const chatService = createChatService(store);
  const runtimeRegistry = createRuntimeRegistry();
  ipcMain.handle("runtime:status", () => getRuntimeStatus());
  ipcMain.handle("runtime:adapters", () => runtimeRegistry.list());
  ipcMain.handle("runtime:generate", (_event, runtimeId, request) => {
    if (typeof runtimeId !== "string" || !runtimeId.trim())
      throw new Error("Runtime id is required");
    if (!request || typeof request !== "object")
      throw new Error("Runtime request must be an object");
    return runtimeRegistry.generate(runtimeId, request);
  });
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
    {
      name: "workspace.list",
      description: "List files inside the approved workspace",
    },
    {
      name: "workspace.read",
      description: "Read a text file inside the approved workspace",
    },
    {
      name: "collaboration.journal",
      description:
        "Synchronize versioned collaboration sessions with conflict evidence",
    },
  ]);
  ipcMain.handle("mcp:dispatch", async (_event, request) => {
    const workspacePath = store.snapshot().settings.workspacePath;
    const registry = createCoreMcpRegistry({
      workspacePath,
      gitStatus: gitStatusAt,
      classifyCommand,
      listFiles: listWorkspaceFiles,
      readFile: readWorkspaceFile,
    });
    return registry.dispatch(request);
  });
  ipcMain.handle("agents:list", () =>
    loadCustomAgents(store.snapshot().settings.workspacePath).map(
      ({ prompt, ...agent }) => agent,
    ),
  );
  ipcMain.handle("plugins:list", () =>
    listPlugins(store.snapshot().settings.workspacePath),
  );
  ipcMain.handle("plugins:marketplace", (_event, url, publicKey) => {
    if (typeof url !== "string" || url.length > 2048)
      throw new Error("Marketplace URL is required and must be bounded");
    if (typeof publicKey !== "string" || publicKey.length > 16 * 1024)
      throw new Error(
        "Marketplace verification key is required and must be bounded",
      );
    return fetchMarketplaceIndex(url, { publicKey });
  });
  ipcMain.handle("models:list", (_event, options) =>
    listLicensedModels(options),
  );
  ipcMain.handle("models:search", (_event, query) =>
    searchHuggingFaceModels(typeof query === "string" ? query : ""),
  );
  ipcMain.handle("models:cache", () => modelCache.list());
  ipcMain.handle(
    "models:prepare",
    (_event, modelId, quantization, selectedModel) =>
      modelCache.prepare(modelId, quantization, selectedModel),
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
  ipcMain.handle("collaboration:list", () => store.collaborationList());
  ipcMain.handle("collaboration:create", (_event, input) =>
    store.collaborationCreate(input || {}),
  );
  ipcMain.handle("collaboration:join", (_event, id, input) =>
    store.collaborationJoin(id, input || {}),
  );
  ipcMain.handle("collaboration:append", (_event, id, event, options) =>
    store.collaborationAppend(id, event || {}, options || {}),
  );
  ipcMain.handle("collaboration:merge", (_event, id, events, options) =>
    store.collaborationMerge(id, events || [], options || {}),
  );
  ipcMain.handle("chat:history", () => chatService.history());
  ipcMain.handle("chat:send", (_event, content) => {
    const result = chatService.send(content);
    window.webContents.send("workspace:changed", store.snapshot());
    return result;
  });
  ipcMain.handle("artifact:get", (_event, id) => store.getArtifact(id));
  ipcMain.handle("artifact:review", (_event, { id, decision, note }) => {
    const artifact = store.reviewArtifact(id, decision, note);
    if (!artifact) throw new Error("Artifact was not found");
    window.webContents.send("workspace:changed", store.snapshot());
    return artifact;
  });
  ipcMain.handle("audit:list", () => store.auditLog());
  ipcMain.handle("audit:export", () => exportAuditLog(store.auditLog()));
  ipcMain.handle("mission:plan", (_event, description) =>
    createExecutionPlan(description, {
      workspacePath: store.snapshot().settings.workspacePath,
    }),
  );
  ipcMain.handle("settings:get", () => store.snapshot().settings);
  ipcMain.handle("settings:update", (_event, update) =>
    store.updateSettings(update),
  );
  ipcMain.handle("connections:list", () => store.snapshot().connections);
  ipcMain.handle("remote:providers", () => listServerProviders());
  ipcMain.handle("remote:templates", () => listServerTemplates());
  ipcMain.handle("remote:estimate-cost", (_event, provider, plan, hours) =>
    estimateServerCost(provider, plan, hours),
  );
  ipcMain.handle("remote:router-guidance", (_event, method) =>
    getRouterGuidance(method),
  );
  ipcMain.handle("connections:add", (_event, profile) => {
    if (
      !profile ||
      typeof profile.name !== "string" ||
      typeof profile.host !== "string"
    )
      throw new Error("Connection name and host are required");
    const validation = validateRemoteConfig(profile);
    if (!validation.valid)
      throw new Error(
        `Missing connection fields: ${validation.missing.join(", ")}`,
      );
    return store.addConnection({
      name: profile.name.trim(),
      host: profile.host.trim(),
      username:
        typeof profile.username === "string" ? profile.username.trim() : "",
      transport: profile.transport || "ssh",
      status: "saved",
    });
  });
  ipcMain.handle("connections:validate", (_event, profile) => {
    const validation = validateRemoteConfig(profile || {});
    const transport = validation.transport;
    return {
      valid: validation.valid,
      transport,
      message: validation.valid
        ? `${transport.toUpperCase()} profile is ready for an approval-gated connection`
        : `Missing connection fields: ${validation.missing.join(", ")}`,
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
    const executionMode = store.snapshot().settings.executionMode;
    const dangerous = requiresMissionApproval(normalized, executionMode);
    const mission = store.addMission(normalized);
    if (!dangerous && store.snapshot().settings.executionMode === "yolo") {
      store.addActivity({
        agent: "Policy engine",
        message:
          "YOLO mode enabled; mission execution proceeded without an interactive approval prompt",
      });
    }
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
