const path = require("path");
const { app, BrowserWindow } = require("electron");
const { registerDesktopApi } = require("./desktop-api");
const { createMissionStore } = require("./mission-store");

function createMissionRunner(store, window) {
  return (mission) => {
    const stages = [
      {
        status: "building",
        agent: "Build agent",
        message: "Plan approved; implementing the mission",
      },
      {
        status: "verifying",
        agent: "Verify agent",
        message: "Build complete; running verification",
      },
      {
        status: "complete",
        agent: "Verify agent",
        message: "Verification complete; artifact is ready",
      },
    ];

    stages.forEach((stage, index) => {
      setTimeout(
        () => {
          store.updateMission(mission.id, { status: stage.status });
          store.addActivity({ agent: stage.agent, message: stage.message });
          if (stage.status === "complete") {
            store.addArtifact({
              missionId: mission.id,
              name: "Mission verification report",
              type: "verification",
              status: "ready",
              content: `Verified mission: ${mission.description}`,
            });
          }
          if (!window.isDestroyed())
            window.webContents.send("workspace:changed", store.snapshot());
        },
        900 * (index + 1),
      );
    });
  };
}

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
  win.loadFile("src/renderer/index.html");
  const store = createMissionStore(
    path.join(app.getPath("userData"), "workspace.json"),
  );
  registerDesktopApi({
    store,
    window: win,
    runMission: createMissionRunner(store, win),
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
