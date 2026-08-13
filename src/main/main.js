const path = require("path");
const { app, BrowserWindow } = require("electron");
const { registerDesktopApi } = require("./desktop-api");
const { createMissionStore } = require("./mission-store");
const { createMissionRunner } = require("./mission-runner");
const { createModelCache } = require("./model-cache");
const { createLocalStageExecutor } = require("./stage-executor");
const { createBridgeServer } = require("./mcp-bridge");
const { requiresMissionApproval } = require("./policy-engine");

function createWindow() {
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
  win.loadFile(path.join(__dirname, "../renderer/index.html"));
  const store = createMissionStore(
    path.join(app.getPath("userData"), "workspace.json"),
  );
  let bridge = null;
  if (process.env.SPARTANCODE_BRIDGE_PORT) {
    const bridgeHost = process.env.SPARTANCODE_BRIDGE_HOST || "127.0.0.1";
    const hasToken = Boolean(process.env.SPARTANCODE_BRIDGE_TOKEN);
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
      token: process.env.SPARTANCODE_BRIDGE_TOKEN || null,
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
      requiresMissionApproval: (description) =>
        requiresMissionApproval(
          description,
          store.snapshot().settings.executionMode,
        ),
    });
    bridge.listen(
      Number(process.env.SPARTANCODE_BRIDGE_PORT),
      bridgeHost,
    );
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
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
