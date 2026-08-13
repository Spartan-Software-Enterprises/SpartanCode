const path = require("path");
const { app, BrowserWindow } = require("electron");
const { registerDesktopApi } = require("./desktop-api");
const { createMissionStore } = require("./mission-store");
const { createMissionRunner } = require("./mission-runner");
const { createModelCache } = require("./model-cache");
const { createLocalStageExecutor } = require("./stage-executor");
const { createBridgeServer } = require("./mcp-bridge");

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
    bridge = createBridgeServer({
      store,
      token: process.env.SPARTANCODE_BRIDGE_TOKEN || null,
    });
    bridge.listen(
      Number(process.env.SPARTANCODE_BRIDGE_PORT),
      process.env.SPARTANCODE_BRIDGE_HOST || "127.0.0.1",
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
