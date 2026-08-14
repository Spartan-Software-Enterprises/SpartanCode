const { ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { getRuntimeStatus } = require("./runtime-status");
const {
  createCommitMessagePrompt,
  gitStatusAt,
  gitDiffAt,
  gitInitAt,
  gitAddAt,
  gitCommitAt,
  normalizeCommitMessage,
} = require("./git");
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
const {
  listWorkspaceFiles,
  readWorkspaceFile,
  resolveInsideWorkspace,
} = require("./workspace-tools");
const { importVscodeProject } = require("./vscode-project-importer");
const { importJetbrainsProject } = require("./jetbrains-project-importer");
const {
  importVisualStudioProject,
} = require("./visual-studio-project-importer");
const { importEclipseProject } = require("./eclipse-project-importer");
const { writeDevContainerConfig } = require("./devcontainer");
const { createModelCache } = require("./model-cache");
const {
  getEmotionAwarenessStatus,
  resolveInteractionStyle,
} = require("./emotion-awareness");
const {
  getTransportStatus,
  validateRemoteConfig,
  probeRemoteConnection,
} = require("./remote-connection");
const { listBundledAgents, loadCustomAgents } = require("./custom-agents");
const { createRuntimeRegistry } = require("./runtime-adapters");
const { listPlugins } = require("./plugin-registry");
const {
  downloadMarketplaceArtifact,
  activateMarketplacePlugin,
  deactivateMarketplacePlugin,
  fetchMarketplaceIndex,
  createMarketplaceTrustRegistry,
} = require("./plugin-marketplace");
const { createMarketplacePluginRunner } = require("./plugin-runner");
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
const { createProcessAutomation } = require("./process-automation");
const { createProtonAdapter } = require("./proton-adapter");
const { createProtonDriveStorage } = require("./proton-drive-storage");
const { createProtonPassProvider } = require("./proton-pass");
const { createPrivacyNetwork } = require("./privacy-network");
const {
  estimateServerCost,
  buildServerSetupPlan,
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
  const processAutomation = createProcessAutomation();
  const protonAdapter = createProtonAdapter({
    environment: providerEnvironment,
    secureVault,
  });
  const protonPassProvider = createProtonPassProvider({
    environment: providerEnvironment,
  });
  const protonDriveStorage = createProtonDriveStorage({
    environment: providerEnvironment,
    secureVault,
    protonPassProvider,
  });
  const privacyNetwork = createPrivacyNetwork();
  const marketplaceTrust = createMarketplaceTrustRegistry();
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
  ipcMain.handle("process:status", () => processAutomation.status());
  ipcMain.handle("process:launch", (_event, request) =>
    processAutomation.launch(request),
  );
  ipcMain.handle("proton:status", () => protonAdapter.status());
  ipcMain.handle("proton:request", (_event, request) =>
    protonAdapter.request(request),
  );
  ipcMain.handle("proton-drive:status", () => protonDriveStorage.status());
  ipcMain.handle("proton-drive:version", () => protonDriveStorage.version());
  ipcMain.handle("proton-pass:status", () => protonPassProvider.status());
  ipcMain.handle("proton-pass:version", () => protonPassProvider.version());
  ipcMain.handle("proton-pass:get", (_event, reference) =>
    protonPassProvider.get(reference),
  );
  ipcMain.handle("proton-drive:backup", (_event, sourcePath, remoteParent) => {
    const workspacePath = store.snapshot().settings.workspacePath;
    if (!workspacePath) throw new Error("Choose a workspace before backing up");
    if (typeof sourcePath !== "string" || !path.isAbsolute(sourcePath))
      throw new Error("Backup source must be an absolute path");
    const relative = path.relative(workspacePath, sourcePath);
    if (relative.startsWith("..") || path.isAbsolute(relative))
      throw new Error(
        "Backup source must remain inside the selected workspace",
      );
    return protonDriveStorage.backupFile(sourcePath, remoteParent);
  });
  ipcMain.handle("proton-drive:backup-workspace", (_event, remoteParent) => {
    const workspacePath = store.snapshot().settings.workspacePath;
    if (!workspacePath) throw new Error("Choose a workspace before backing up");
    return protonDriveStorage.backupBytes(
      Buffer.from(JSON.stringify(store.snapshot()), "utf8"),
      remoteParent,
      "spartancode-workspace.spartancode.enc",
    );
  });
  ipcMain.handle(
    "proton-drive:restore",
    (_event, remotePath, destinationPath) => {
      const workspacePath = store.snapshot().settings.workspacePath;
      if (!workspacePath)
        throw new Error("Choose a workspace before restoring");
      if (
        typeof destinationPath !== "string" ||
        !path.isAbsolute(destinationPath)
      )
        throw new Error("Restore destination must be an absolute path");
      const relative = path.relative(workspacePath, destinationPath);
      if (relative.startsWith("..") || path.isAbsolute(relative))
        throw new Error(
          "Restore destination must remain inside the selected workspace",
        );
      return protonDriveStorage.restoreFile(remotePath, destinationPath);
    },
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
  const codespacesClient = () =>
    githubApp.createUserAuthorizedCodespacesClient({
      tokenProvider: () => secureVault.get("GITHUB_USER_TOKEN"),
    });
  ipcMain.handle("github-app:codespaces-status", () => {
    let tokenConfigured = false;
    try {
      tokenConfigured = Boolean(secureVault.get("GITHUB_USER_TOKEN"));
    } catch {
      tokenConfigured = false;
    }
    return {
      tokenConfigured,
      authorization: "user token in encrypted local vault",
      installationTokenSupported: false,
    };
  });
  ipcMain.handle("github-app:codespaces-list", () => codespacesClient().list());
  ipcMain.handle("github-app:codespaces-create", (_event, input) =>
    codespacesClient().create(input || {}),
  );
  ipcMain.handle("github-app:codespaces-start", (_event, name) =>
    codespacesClient().start(name),
  );
  ipcMain.handle("github-app:codespaces-stop", (_event, name) =>
    codespacesClient().stop(name),
  );
  ipcMain.handle("github-app:codespaces-delete", (_event, name) =>
    codespacesClient().delete(name),
  );
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
  ipcMain.handle("plugins:marketplace", async (_event, url, publicKey) => {
    if (typeof url !== "string" || url.length > 2048)
      throw new Error("Marketplace URL is required and must be bounded");
    if (typeof publicKey !== "string" || publicKey.length > 16 * 1024)
      throw new Error(
        "Marketplace verification key is required and must be bounded",
      );
    const index = await fetchMarketplaceIndex(url, { publicKey });
    marketplaceTrust.remember(index);
    return index;
  });
  ipcMain.handle("plugins:download", (_event, manifest) => {
    if (!marketplaceDir) throw new Error("Marketplace staging is unavailable");
    return downloadMarketplaceArtifact(marketplaceTrust.resolve(manifest), {
      destinationDir: marketplaceDir,
    });
  });
  ipcMain.handle("plugins:activate", (_event, manifest) => {
    if (!marketplaceDir) throw new Error("Marketplace staging is unavailable");
    const workspacePath = store.snapshot().settings.workspacePath;
    return activateMarketplacePlugin(marketplaceTrust.resolve(manifest), {
      stagingDir: marketplaceDir,
      workspacePath,
    });
  });
  ipcMain.handle("plugins:deactivate", (_event, manifest) => {
    const workspacePath = store.snapshot().settings.workspacePath;
    return deactivateMarketplacePlugin(marketplaceTrust.resolve(manifest), {
      workspacePath,
    });
  });
  ipcMain.handle("plugins:run", (_event, manifest, input) => {
    if (!marketplaceDir) throw new Error("Marketplace staging is unavailable");
    const workspacePath = store.snapshot().settings.workspacePath;
    return createMarketplacePluginRunner({
      stagingDir: marketplaceDir,
      workspacePath,
    }).run(marketplaceTrust.resolve(manifest), input);
  });
  ipcMain.handle("models:list", (_event, options) =>
    listAvailableModels(options),
  );
  ipcMain.handle("models:search", (_event, query, options) =>
    searchHuggingFaceModels(typeof query === "string" ? query : "", options),
  );
  ipcMain.handle("models:cache", () => modelCache.list());
  ipcMain.handle(
    "models:download",
    (_event, modelId, url, expectedSha256, quantization, selectedModel) =>
      modelCache.download(
        modelId,
        url,
        expectedSha256,
        quantization,
        selectedModel,
      ),
  );
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
  ipcMain.handle("vscode:project-import", (_event, projectPath) => {
    const workspacePath = store.snapshot().settings.workspacePath;
    const approvedProject = resolveInsideWorkspace(
      workspacePath,
      projectPath || ".",
    );
    return importVscodeProject(approvedProject);
  });
  ipcMain.handle("jetbrains:project-import", (_event, projectPath) => {
    const workspacePath = store.snapshot().settings.workspacePath;
    const approvedProject = resolveInsideWorkspace(
      workspacePath,
      projectPath || ".",
    );
    return importJetbrainsProject(approvedProject);
  });
  ipcMain.handle("visual-studio:project-import", (_event, projectPath) => {
    const workspacePath = store.snapshot().settings.workspacePath;
    const approvedProject = resolveInsideWorkspace(
      workspacePath,
      projectPath || ".",
    );
    return importVisualStudioProject(approvedProject);
  });
  ipcMain.handle("eclipse:project-import", (_event, projectPath) => {
    const workspacePath = store.snapshot().settings.workspacePath;
    const approvedProject = resolveInsideWorkspace(
      workspacePath,
      projectPath || ".",
    );
    return importEclipseProject(approvedProject);
  });
  ipcMain.handle("devcontainer:generate", (_event, projectPath, options) => {
    const workspacePath = store.snapshot().settings.workspacePath;
    return writeDevContainerConfig(
      workspacePath,
      projectPath || ".",
      options || {},
    );
  });
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
  ipcMain.handle("interaction:status", () => getEmotionAwarenessStatus());
  ipcMain.handle("interaction:style", (_event, input) =>
    resolveInteractionStyle({
      mode: store.snapshot().settings.emotionMode,
      signal: input?.signal || store.snapshot().settings.interactionSignal,
    }),
  );
  ipcMain.handle("settings:resolve", (_event, context) =>
    store.resolveSettings(context || {}),
  );
  ipcMain.handle("settings:update", (_event, update) =>
    store.updateSettings(update),
  );
  ipcMain.handle("settings:update-scoped", (_event, scope, id, update) =>
    store.updateScopedSettings(scope, id, update),
  );
  ipcMain.handle("connections:list", () => store.snapshot().connections);
  ipcMain.handle("remote:providers", () => listServerProviders());
  ipcMain.handle("remote:templates", () => listServerTemplates());
  ipcMain.handle("remote:setup-plan", (_event, templateId, routerMethod) =>
    buildServerSetupPlan(templateId, routerMethod),
  );
  ipcMain.handle("remote:estimate-cost", (_event, provider, plan, hours) =>
    estimateServerCost(provider, plan, hours),
  );
  ipcMain.handle("remote:router-guidance", (_event, method) =>
    getRouterGuidance(method),
  );
  ipcMain.handle("remote:transport-status", (_event, transport) =>
    getTransportStatus(transport),
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
  ipcMain.handle("connections:probe", (_event, profile) =>
    probeRemoteConnection(profile || {}),
  );
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
  ipcMain.handle("git:commit-message", async (_event, providerId) => {
    const workspacePath = store.snapshot().settings.workspacePath;
    if (!workspacePath)
      return { available: false, message: "Choose a workspace first" };
    if (typeof providerId !== "string" || !providerId.trim())
      throw new Error("Provider id is required");
    try {
      const diff = await gitDiffAt(workspacePath);
      const result = await apiGateway.generate(providerId, {
        prompt: createCommitMessagePrompt(diff),
        maxTokens: 80,
        temperature: 0.2,
      });
      return {
        available: true,
        provider: result.provider,
        model: result.model,
        message: normalizeCommitMessage(result.output),
      };
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
