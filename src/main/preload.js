const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("spartanCode", {
  getSnapshot: () => ipcRenderer.invoke("workspace:snapshot"),
  getArtifact: (id) => ipcRenderer.invoke("artifact:get", id),
  reviewArtifact: (id, decision, note) =>
    ipcRenderer.invoke("artifact:review", { id, decision, note }),
  getAuditLog: () => ipcRenderer.invoke("audit:list"),
  previewPlan: (description) => ipcRenderer.invoke("mission:plan", description),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (update) => ipcRenderer.invoke("settings:update", update),
  chooseWorkspace: () => ipcRenderer.invoke("workspace:choose"),
  getGitStatus: () => ipcRenderer.invoke("git:status"),
  gitInit: () => ipcRenderer.invoke("git:init"),
  gitStage: () => ipcRenderer.invoke("git:stage"),
  gitCommit: (message) => ipcRenderer.invoke("git:commit", message),
  listConnections: () => ipcRenderer.invoke("connections:list"),
  addConnection: (profile) => ipcRenderer.invoke("connections:add", profile),
  validateConnection: (profile) =>
    ipcRenderer.invoke("connections:validate", profile),
  getRuntimeStatus: () => ipcRenderer.invoke("runtime:status"),
  getCapabilities: () => ipcRenderer.invoke("capabilities:get"),
  getProviderStatus: () => ipcRenderer.invoke("providers:get"),
  getVoiceStatus: () => ipcRenderer.invoke("voice:status"),
  startVoice: () => ipcRenderer.invoke("voice:start"),
  getMcpTools: () => ipcRenderer.invoke("mcp:tools"),
  dispatchMcp: (request) => ipcRenderer.invoke("mcp:dispatch", request),
  listModels: (options) => ipcRenderer.invoke("models:list", options),
  listCachedModels: () => ipcRenderer.invoke("models:cache"),
  prepareModel: (modelId, quantization) =>
    ipcRenderer.invoke("models:prepare", modelId, quantization),
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
