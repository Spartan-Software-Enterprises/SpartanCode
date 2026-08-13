const path = require("path");
const { app, BrowserWindow } = require("electron");
const { registerDesktopApi } = require("./desktop-api");
const { createMissionStore } = require("./mission-store");
const { createMissionRunner } = require("./mission-runner");
const { createModelCache } = require("./model-cache");
const { createLocalStageExecutor } = require("./stage-executor");

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
  registerDesktopApi({
    store,
    window: win,
    runMission: createMissionRunner(store, win, {
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
