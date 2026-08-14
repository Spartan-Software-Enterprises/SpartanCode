const path = require("path");
const { app, BrowserWindow, safeStorage, shell } = require("electron");
const { registerDesktopApi } = require("./desktop-api");
const { createMissionStore } = require("./mission-store");
const { createMissionRunner } = require("./mission-runner");
const { createModelCache } = require("./model-cache");
const { createLocalStageExecutor } = require("./stage-executor");
const { createBridgeServer } = require("./mcp-bridge");
const { requiresMissionApproval } = require("./policy-engine");
const { createSecureVault } = require("./secure-vault");
const { apiProviders } = require("./api-providers");
const { createPreviewWindow } = require("./preview-window");
const { createMemoryStore } = require("./memory-store");
const {
  createCrashReporter,
  createRendererRecoveryController,
} = require("./crash-recovery");
const { gitStatusAt, gitDiffAt, gitAddAt, gitCommitAt } = require("./git");

function createWindow(crashReporter) {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#f7f8fc",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });
  const rendererRecovery = createRendererRecoveryController({
    reporter: crashReporter,
    reload: () => {
      if (!win.isDestroyed())
        win.loadFile(path.join(__dirname, "../renderer/index.html"));
    },
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    rendererRecovery.handle(details);
  });
  win.webContents.on("unresponsive", () => {
    crashReporter.record("renderer-unresponsive");
  });
  win.loadFile(path.join(__dirname, "../renderer/index.html"));
  const store = createMissionStore(
    path.join(app.getPath("userData"), "workspace.json"),
  );
  const previewWindow = createPreviewWindow({ BrowserWindow, shell });
  const secureVault = createSecureVault({
    safeStorage,
    filePath: path.join(app.getPath("userData"), "secure-vault.json"),
  });
  const savedSecret = (name) => {
    try {
      return secureVault.get(name) || undefined;
    } catch {
      return undefined;
    }
  };
  const githubEnvironment = {
    ...process.env,
    SPARTANCODE_GITHUB_APP_ID:
      process.env.SPARTANCODE_GITHUB_APP_ID ||
      savedSecret("SPARTANCODE_GITHUB_APP_ID"),
    SPARTANCODE_GITHUB_APP_INSTALLATION_ID:
      process.env.SPARTANCODE_GITHUB_APP_INSTALLATION_ID ||
      savedSecret("SPARTANCODE_GITHUB_APP_INSTALLATION_ID"),
    SPARTANCODE_GITHUB_APP_PRIVATE_KEY:
      process.env.SPARTANCODE_GITHUB_APP_PRIVATE_KEY ||
      savedSecret("SPARTANCODE_GITHUB_APP_PRIVATE_KEY"),
    SPARTANCODE_GITHUB_APP_WEBHOOK_SECRET:
      process.env.SPARTANCODE_GITHUB_APP_WEBHOOK_SECRET ||
      savedSecret("SPARTANCODE_GITHUB_APP_WEBHOOK_SECRET"),
  };
  const providerEnvironment = { ...process.env };
  for (const provider of apiProviders) {
    if (!providerEnvironment[provider.key])
      providerEnvironment[provider.key] = savedSecret(provider.key);
  }
  const savedBridgeToken =
    process.env.SPARTANCODE_BRIDGE_TOKEN ||
    savedSecret("SPARTANCODE_BRIDGE_TOKEN");
  let bridge = null;
  if (process.env.SPARTANCODE_BRIDGE_PORT) {
    const bridgeHost = process.env.SPARTANCODE_BRIDGE_HOST || "127.0.0.1";
    const hasToken = Boolean(savedBridgeToken);
    const hasOidc = Boolean(
      process.env.SPARTANCODE_BRIDGE_OIDC_ISSUER &&
      process.env.SPARTANCODE_BRIDGE_OIDC_AUDIENCE,
    );
    const isLoopback = ["127.0.0.1", "::1", "localhost"].includes(bridgeHost);
    if (!hasToken && !hasOidc && !isLoopback) {
      throw new Error(
        "SPARTANCODE_BRIDGE_TOKEN or complete OIDC configuration is required for a non-loopback bridge",
      );
    }
    bridge = createBridgeServer({
      store,
      git: {
        status: async () => {
          const workspacePath = store.snapshot().settings.workspacePath;
          if (!workspacePath) throw new Error("Choose a workspace first");
          return gitStatusAt(workspacePath);
        },
        diff: async () => {
          const workspacePath = store.snapshot().settings.workspacePath;
          if (!workspacePath) throw new Error("Choose a workspace first");
          return gitDiffAt(workspacePath);
        },
        stage: async () => {
          const workspacePath = store.snapshot().settings.workspacePath;
          if (!workspacePath) throw new Error("Choose a workspace first");
          return gitAddAt(workspacePath);
        },
        commit: async (message) => {
          const workspacePath = store.snapshot().settings.workspacePath;
          if (!workspacePath) throw new Error("Choose a workspace first");
          return gitCommitAt(workspacePath, message);
        },
      },
      token: savedBridgeToken || null,
      oidc:
        process.env.SPARTANCODE_BRIDGE_OIDC_ISSUER &&
        process.env.SPARTANCODE_BRIDGE_OIDC_AUDIENCE
          ? {
              issuer: process.env.SPARTANCODE_BRIDGE_OIDC_ISSUER,
              audience: process.env.SPARTANCODE_BRIDGE_OIDC_AUDIENCE,
              jwksUri: process.env.SPARTANCODE_BRIDGE_OIDC_JWKS_URI || null,
            }
          : null,
      allowUnauthenticated: isLoopback && !hasToken && !hasOidc,
      githubWebhookSecret:
        githubEnvironment.SPARTANCODE_GITHUB_APP_WEBHOOK_SECRET || null,
      requiresMissionApproval: (description) =>
        requiresMissionApproval(
          description,
          store.snapshot().settings.executionMode,
        ),
    });
    bridge.listen(Number(process.env.SPARTANCODE_BRIDGE_PORT), bridgeHost);
    app.once("will-quit", () => bridge.close());
  }
  registerDesktopApi({
    store,
    window: win,
    runMission: createMissionRunner(store, win, {
      events: bridge?.events,
      executeStage: createLocalStageExecutor({
        getWorkspacePath: () => store.snapshot().settings.workspacePath,
      }),
    }),
    modelCache: createModelCache(
      path.join(app.getPath("userData"), "models.json"),
    ),
    marketplaceDir: path.join(app.getPath("userData"), "marketplace"),
    marketplacePublicKey:
      process.env.SPARTANCODE_MARKETPLACE_PUBLIC_KEY || null,
    secureVault,
    githubEnvironment,
    providerEnvironment,
    previewWindow,
    memoryStore: createMemoryStore({ secureVault }),
  });
}

app.whenReady().then(() => {
  const crashReporter = createCrashReporter(
    path.join(app.getPath("userData"), "crash-recovery.json"),
  );
  createWindow(crashReporter);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(crashReporter);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
