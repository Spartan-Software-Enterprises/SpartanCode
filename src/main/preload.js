const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("spartanCode", {
  getSnapshot: () => ipcRenderer.invoke("workspace:snapshot"),
  listCollaborationSessions: () => ipcRenderer.invoke("collaboration:list"),
  createCollaborationSession: (input) =>
    ipcRenderer.invoke("collaboration:create", input),
  joinCollaborationSession: (id, input) =>
    ipcRenderer.invoke("collaboration:join", id, input),
  appendCollaborationEvent: (id, event, options) =>
    ipcRenderer.invoke("collaboration:append", id, event, options),
  mergeCollaborationEvents: (id, events, options) =>
    ipcRenderer.invoke("collaboration:merge", id, events, options),
  getChatHistory: () => ipcRenderer.invoke("chat:history"),
  sendChatMessage: (content) => ipcRenderer.invoke("chat:send", content),
  getArtifact: (id) => ipcRenderer.invoke("artifact:get", id),
  reviewArtifact: (id, decision, note) =>
    ipcRenderer.invoke("artifact:review", { id, decision, note }),
  getAuditLog: () => ipcRenderer.invoke("audit:list"),
  exportAuditLog: () => ipcRenderer.invoke("audit:export"),
  previewPlan: (description) => ipcRenderer.invoke("mission:plan", description),
  listAgents: () => ipcRenderer.invoke("agents:list"),
  listPlugins: () => ipcRenderer.invoke("plugins:list"),
  fetchMarketplacePlugins: (url, publicKey) =>
    ipcRenderer.invoke("plugins:marketplace", url, publicKey),
  downloadMarketplacePlugin: (manifest) =>
    ipcRenderer.invoke("plugins:download", manifest),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (update) => ipcRenderer.invoke("settings:update", update),
  chooseWorkspace: () => ipcRenderer.invoke("workspace:choose"),
  getGitStatus: () => ipcRenderer.invoke("git:status"),
  gitInit: () => ipcRenderer.invoke("git:init"),
  gitStage: () => ipcRenderer.invoke("git:stage"),
  gitCommit: (message) => ipcRenderer.invoke("git:commit", message),
  listConnections: () => ipcRenderer.invoke("connections:list"),
  listRemoteProviders: () => ipcRenderer.invoke("remote:providers"),
  listServerTemplates: () => ipcRenderer.invoke("remote:templates"),
  estimateRemoteCost: (provider, plan, hours) =>
    ipcRenderer.invoke("remote:estimate-cost", provider, plan, hours),
  getRouterGuidance: (method) =>
    ipcRenderer.invoke("remote:router-guidance", method),
  addConnection: (profile) => ipcRenderer.invoke("connections:add", profile),
  validateConnection: (profile) =>
    ipcRenderer.invoke("connections:validate", profile),
  getRuntimeStatus: () => ipcRenderer.invoke("runtime:status"),
  listRuntimeAdapters: () => ipcRenderer.invoke("runtime:adapters"),
  getBrowserStatus: () => ipcRenderer.invoke("browser:status"),
  runBrowserAutomation: (request) => ipcRenderer.invoke("browser:run", request),
  getSystemAutomationStatus: () => ipcRenderer.invoke("system:status"),
  runSystemAutomation: (request) => ipcRenderer.invoke("system:run", request),
  getGuiAutomationStatus: () => ipcRenderer.invoke("gui:status"),
  runGuiAutomation: (request) => ipcRenderer.invoke("gui:run", request),
  getPrivacyNetworkStatus: () => ipcRenderer.invoke("privacy:status"),
  configurePrivacyNetwork: (request) =>
    ipcRenderer.invoke("privacy:configure", request),
  listSkillSources: () => ipcRenderer.invoke("skills:sources"),
  listSkills: () => ipcRenderer.invoke("skills:list"),
  loadSkill: (skillId) => ipcRenderer.invoke("skills:load", skillId),
  getMemoryStatus: () => ipcRenderer.invoke("memory:status"),
  addMemory: (input) => ipcRenderer.invoke("memory:add", input),
  listMemory: () => ipcRenderer.invoke("memory:list"),
  searchMemory: (query, limit) =>
    ipcRenderer.invoke("memory:search", query, limit),
  deleteMemory: (id) => ipcRenderer.invoke("memory:delete", id),
  clearMemory: () => ipcRenderer.invoke("memory:clear"),
  generateWithRuntime: (runtimeId, request) =>
    ipcRenderer.invoke("runtime:generate", runtimeId, request),
  getCapabilities: () => ipcRenderer.invoke("capabilities:get"),
  getProviderStatus: () => ipcRenderer.invoke("providers:get"),
  listApiProviders: () => ipcRenderer.invoke("api:providers"),
  generateWithApiProvider: (providerId, request) =>
    ipcRenderer.invoke("api:generate", providerId, request),
  openProjectPreview: (url) => ipcRenderer.invoke("preview:open", url),
  closeProjectPreview: () => ipcRenderer.invoke("preview:close"),
  getProjectPreviewStatus: () => ipcRenderer.invoke("preview:status"),
  openCodeRabbitLogin: () => ipcRenderer.invoke("coderabbit:login"),
  getGitHubAppStatus: () => ipcRenderer.invoke("github-app:status"),
  listGitHubRepositories: () => ipcRenderer.invoke("github-app:repositories"),
  getSecureVaultStatus: () => ipcRenderer.invoke("secure-vault:status"),
  listSecureKeys: () => ipcRenderer.invoke("secure-vault:list"),
  saveSecureKey: (name, value) =>
    ipcRenderer.invoke("secure-vault:set", name, value),
  deleteSecureKey: (name) => ipcRenderer.invoke("secure-vault:delete", name),
  getVoiceStatus: () => ipcRenderer.invoke("voice:status"),
  startVoice: () => ipcRenderer.invoke("voice:start"),
  getVoiceOutputStatus: () => ipcRenderer.invoke("voice:output-status"),
  speak: (text) => ipcRenderer.invoke("voice:speak", text),
  getMcpTools: () => ipcRenderer.invoke("mcp:tools"),
  dispatchMcp: (request) => ipcRenderer.invoke("mcp:dispatch", request),
  listModels: (options) => ipcRenderer.invoke("models:list", options),
  searchModels: (query, options) =>
    ipcRenderer.invoke("models:search", query, options),
  listCachedModels: () => ipcRenderer.invoke("models:cache"),
  prepareModel: (modelId, quantization, selectedModel) =>
    ipcRenderer.invoke("models:prepare", modelId, quantization, selectedModel),
  classifyCommand: (command) => ipcRenderer.invoke("policy:classify", command),
  listWorkspace: (requestedPath) =>
    ipcRenderer.invoke("workspace:list", requestedPath),
  readWorkspaceFile: (requestedPath) =>
    ipcRenderer.invoke("workspace:read", requestedPath),
  startMission: (description) =>
    ipcRenderer.invoke("mission:start", description),
  resolveApproval: (approvalId, decision) =>
    ipcRenderer.invoke("approval:resolve", { approvalId, decision }),
  clearMissions: () => ipcRenderer.invoke("missions:clear"),
  onWorkspaceChanged: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on("workspace:changed", listener);
    return () => ipcRenderer.removeListener("workspace:changed", listener);
  },
});
