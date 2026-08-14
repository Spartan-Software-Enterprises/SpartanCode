const { ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { getRuntimeStatus } = require("./runtime-status");
const { gitStatusAt, gitInitAt, gitAddAt, gitCommitAt } = require("./git");
const {
  listLicensedModels,
  listAvailableModels,
  searchHuggingFaceModels,
} = require("./model-catalog");
const { classifyCommand, requiresMissionApproval } = require("./policy-engine");
const { getCapabilities } = require("./capabilities");
const { getProviderStatus } = require("./provider-status");
const { createVoiceService } = require("./voice-service");
const { createVoiceOutput } = require("./voice-output");
const { createChatService } = require("./chat-service");
const { createExecutionPlan } = require("./agent-plan");
const { createCoreMcpRegistry } = require("./mcp-lite");
const { listWorkspaceFiles, readWorkspaceFile } = require("./workspace-tools");
const { createModelCache } = require("./model-cache");
const { validateRemoteConfig } = require("./remote-connection");
const { listBundledAgents, loadCustomAgents } = require("./custom-agents");
const { createRuntimeRegistry } = require("./runtime-adapters");
const { listPlugins } = require("./plugin-registry");
const {
  downloadMarketplaceArtifact,
  fetchMarketplaceIndex,
} = require("./plugin-marketplace");
const { exportAuditLog } = require("./audit-export");
const { createGitHubAppClient } = require("./github-app");
const { createApiGateway } = require("./api-providers");
const { createBrowserAutomation } = require("./browser-automation");
const {
  discoverSkills,
  listExternalSkillSources,
  loadSkill,
} = require("./skill-registry");
const { createWindowsAutomation } = require("./windows-automation");
const { createGuiAutomation } = require("./gui-automation");
const { createPrivacyNetwork } = require("./privacy-network");
const {
  estimateServerCost,
  getRouterGuidance,
  listServerProviders,
  listServerTemplates,
} = require("./remote-guidance");

function registerDesktopApi({
  store,
  window,
  runMission,
  modelCache,
  marketplaceDir,
  secureVault,
  githubEnvironment = process.env,
  providerEnvironment = process.env,
  previewWindow = null,
  memoryStore = null,
}) {
  const voiceService = createVoiceService();
  const voiceOutput = createVoiceOutput();
  const chatService = createChatService(store);
  const runtimeRegistry = createRuntimeRegistry();
  const githubApp = createGitHubAppClient({ environment: githubEnvironment });
  const apiGateway = createApiGateway({ environment: providerEnvironment });
  const browserAutomation = createBrowserAutomation({
    environment: process.env,
    audit: ({ action, host }) =>
      store.addActivity({
        agent: "Browser adapter",
        message: `${action} completed on ${host}`,
      }),
  });
  const windowsAutomation = createWindowsAutomation();
  const guiAutomation = createGuiAutomation();
  const privacyNetwork = createPrivacyNetwork();
  ipcMain.handle("runtime:status", () => getRuntimeStatus());
  ipcMain.handle("runtime:adapters", () => runtimeRegistry.list());
  ipcMain.handle("browser:status", () => browserAutomation.status());
  ipcMain.handle("browser:run", (_event, request) =>
    browserAutomation.run(request),
  );
  ipcMain.handle("system:status", () => windowsAutomation.status());
  ipcMain.handle("system:run", (_event, request) =>
    windowsAutomation.execute(request),
  );
  ipcMain.handle("gui:status", () => guiAutomation.status());
  ipcMain.handle("gui:run", (_event, request) =>
    guiAutomation.execute(request),
  );
  ipcMain.handle("privacy:status", () => privacyNetwork.status());
  ipcMain.handle("privacy:configure", (_event, request) =>
    privacyNetwork.configure(request),
  );
  ipcMain.handle("skills:sources", () => listExternalSkillSources());
  const skillRoots = () => {
    const workspace = store.snapshot().settings.workspacePath;
    const externalRoot =
      workspace && path.join(workspace, ".spartancode", "external-skills");
    const checkedOutRoots =
      externalRoot && fs.existsSync(externalRoot)
        ? fs
            .readdirSync(externalRoot, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => path.join(externalRoot, entry.name, "skills"))
        : [];
    return [
      ...checkedOutRoots,
      ...String(process.env.SPARTANCODE_SKILL_ROOTS || "")
        .split(path.delimiter)
        .filter(Boolean),
    ].filter(Boolean);
  };
  ipcMain.handle("skills:list", () => {
    return discoverSkills(skillRoots()).map(
      ({ path: _path, ...skill }) => skill,
    );
  });
  ipcMain.handle("skills:load", (_event, skillId) => {
    if (typeof skillId !== "string" || skillId.length > 96)
      throw new Error("Skill id is required");
    const skill = discoverSkills(skillRoots()).find(
      (item) => item.id === skillId,
    );
    if (!skill) throw new Error("Skill was not found in a configured source");
    return loadSkill(skill);
  });
  ipcMain.handle(
    "memory:status",
    () => memoryStore?.status() || { enabled: false },
  );
  ipcMain.handle("memory:add", (_event, input) => memoryStore.add(input));
  ipcMain.handle("memory:list", () => memoryStore.list());
  ipcMain.handle("memory:search", (_event, query, limit) =>
    memoryStore.search(query, limit),
  );
  ipcMain.handle("memory:delete", (_event, id) => memoryStore.delete(id));
  ipcMain.handle("memory:clear", () => memoryStore.clear());
  ipcMain.handle("runtime:generate", (_event, runtimeId, request) => {
    if (typeof runtimeId !== "string" || !runtimeId.trim())
      throw new Error("Runtime id is required");
    if (!request || typeof request !== "object")
      throw new Error("Runtime request must be an object");
    return runtimeRegistry.generate(runtimeId, request);
  });
  ipcMain.handle("capabilities:get", () => getCapabilities());
  ipcMain.handle("providers:get", () => getProviderStatus(providerEnvironment));
  ipcMain.handle("api:providers", () => apiGateway.status());
  ipcMain.handle("api:generate", (_event, providerId, request) =>
    apiGateway.generate(providerId, request),
  );
  ipcMain.handle("preview:open", (_event, url) => {
    if (!previewWindow) throw new Error("Project preview is unavailable");
    return previewWindow.open(url);
  });
  ipcMain.handle(
    "preview:close",
    () => previewWindow?.close() || { closed: true },
  );
  ipcMain.handle(
    "preview:status",
    () => previewWindow?.status() || { open: false, url: null },
  );
  ipcMain.handle("coderabbit:login", async () => {
    await shell.openExternal("https://app.coderabbit.ai");
    return { opened: true, url: "https://app.coderabbit.ai" };
  });
  ipcMain.handle("github-app:status", () => githubApp.status());
  ipcMain.handle("github-app:repositories", () => githubApp.listRepositories());
  ipcMain.handle("secure-vault:status", () => secureVault.status());
  ipcMain.handle("secure-vault:list", () => secureVault.list());
  ipcMain.handle("secure-vault:set", (_event, name, value) => {
    const result = secureVault.set(name, value);
    if (typeof name === "string" && name.startsWith("SPARTANCODE_")) {
      githubEnvironment[name] = value;
      githubApp.refresh(githubEnvironment);
    }
    if (typeof name === "string" && /^[A-Z0-9_]+_API_KEY$/.test(name)) {
      providerEnvironment[name] = value;
      apiGateway.refresh(providerEnvironment);
    }
    return result;
  });
  ipcMain.handle("secure-vault:delete", (_event, name) => {
    const deleted = secureVault.delete(name);
    if (deleted && typeof name === "string") {
      delete providerEnvironment[name];
      if (name.startsWith("SPARTANCODE_")) {
        delete githubEnvironment[name];
        githubApp.refresh(githubEnvironment);
      }
      if (/^[A-Z0-9_]+_API_KEY$/.test(name))
        apiGateway.refresh(providerEnvironment);
    }
    return deleted;
  });
  ipcMain.handle("voice:status", () => voiceService.status());
  ipcMain.handle("voice:start", () => voiceService.start());
  ipcMain.handle("voice:output-status", () => voiceOutput.status());
  ipcMain.handle("voice:speak", (_event, text) => voiceOutput.speak(text));
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
    [
      ...listBundledAgents(),
      ...loadCustomAgents(store.snapshot().settings.workspacePath),
    ].map(({ prompt, ...agent }) => agent),
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
  ipcMain.handle("plugins:download", (_event, manifest) => {
    if (!marketplaceDir) throw new Error("Marketplace staging is unavailable");
    return downloadMarketplaceArtifact(manifest, {
      destinationDir: marketplaceDir,
    });
  });
  ipcMain.handle("models:list", (_event, options) =>
    listAvailableModels(options),
  );
  ipcMain.handle("models:search", (_event, query, options) =>
    searchHuggingFaceModels(typeof query === "string" ? query : "", options),
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
    if (store.snapshot().settings.memoryEnabled !== false) {
      try {
        memoryStore?.add({ content: String(content), source: "chat" });
      } catch {
        // Secret-like or unavailable memory content is intentionally skipped.
      }
    }
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
