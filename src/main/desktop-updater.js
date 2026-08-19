const { app, shell, dialog, BrowserWindow } = require("electron");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const GITHUB_OWNER = "Spartan-Software-Enterprises";
const GITHUB_REPO = "SpartanCode";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const RELEASES_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

function normalizeVersion(v) {
  const cleaned = v.replace(/^[vV]/, "").split("-")[0] || "0.0.0";
  const parts = cleaned.split(".").map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function isNewerVersion(current, candidate) {
  const [cMaj, cMin, cPatch] = normalizeVersion(current);
  const [nMaj, nMin, nPatch] = normalizeVersion(candidate);
  if (nMaj !== cMaj) return nMaj > cMaj;
  if (nMin !== cMin) return nMin > cMin;
  if (nPatch !== cPatch) return nPatch > cPatch;
  const cPre = current.replace(/^[vV]/, "").split("-")[1] || "";
  const nPre = candidate.replace(/^[vV]/, "").split("-")[1] || "";
  if (!nPre && cPre) return true;
  if (nPre && !cPre) return false;
  return nPre > cPre;
}

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": `SpartanCode-Desktop/${app.getVersion()}`,
      },
    };
    https
      .get(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            if (res.statusCode !== 200) return resolve(null);
            const release = JSON.parse(data);
            const tag = release.tag_name || "";
            const version = tag.replace(/^[vV]/, "");
            const asset = (release.assets || []).find(
              (a) =>
                a.name &&
                ((process.platform === "win32" && a.name.endsWith(".exe")) ||
                  (process.platform === "linux" &&
                    (a.name.endsWith(".AppImage") || a.name.endsWith(".deb")))),
            );
            resolve({
              version,
              tag,
              body: release.body || "",
              publishedAt: release.published_at || "",
              assetUrl: asset ? asset.browser_download_url : null,
              assetName: asset ? asset.name : null,
              assetSize: asset ? asset.size : null,
            });
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", () => resolve(null));
  });
}

function installUpdate(assetUrl, assetName, mainWindow) {
  if (process.platform === "win32" && assetName && assetName.endsWith(".exe")) {
    const downloadsDir = path.join(
      app.getPath("downloads"),
      "SpartanCode-Update",
    );
    if (!fs.existsSync(downloadsDir))
      fs.mkdirSync(downloadsDir, { recursive: true });
    const destPath = path.join(downloadsDir, assetName);
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Downloading Update",
      message: `Downloading ${assetName}...`,
      detail: "The installer will open when download completes.",
    });
    const file = fs.createWriteStream(destPath);
    https
      .get(assetUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          https.get(response.headers.location, (redirect) => {
            redirect.pipe(file);
            file.on("finish", () => {
              file.close();
              shell.openPath(destPath);
              app.quit();
            });
          });
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          shell.openPath(destPath);
          app.quit();
        });
      })
      .on("error", (err) => {
        fs.unlink(destPath, () => {});
        dialog.showErrorBox("Download Failed", err.message);
      });
  } else if (
    process.platform === "linux" &&
    assetName &&
    assetName.endsWith(".AppImage")
  ) {
    const downloadsDir = path.join(
      app.getPath("downloads"),
      "SpartanCode-Update",
    );
    if (!fs.existsSync(downloadsDir))
      fs.mkdirSync(downloadsDir, { recursive: true });
    const destPath = path.join(downloadsDir, assetName);
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Downloading Update",
      message: `Downloading ${assetName}...`,
      detail: "The new AppImage will be saved to your Downloads folder.",
    });
    const file = fs.createWriteStream(destPath);
    https
      .get(assetUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          https.get(response.headers.location, (redirect) => {
            redirect.pipe(file);
            file.on("finish", () => {
              file.close();
              fs.chmodSync(destPath, 0o755);
              dialog
                .showMessageBox(mainWindow, {
                  type: "info",
                  title: "Update Ready",
                  message: "Update downloaded successfully.",
                  detail: `New version saved to: ${destPath}\n\nClose this app and run the new AppImage to update.`,
                  buttons: ["Open Location", "Later"],
                })
                .then(({ response }) => {
                  if (response === 0) shell.showItemInFolder(destPath);
                });
            });
          });
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          fs.chmodSync(destPath, 0o755);
          dialog
            .showMessageBox(mainWindow, {
              type: "info",
              title: "Update Ready",
              message: "Update downloaded successfully.",
              detail: `New version saved to: ${destPath}\n\nClose this app and run the new AppImage to update.`,
              buttons: ["Open Location", "Later"],
            })
            .then(({ response }) => {
              if (response === 0) shell.showItemInFolder(destPath);
            });
        });
      })
      .on("error", (err) => {
        fs.unlink(destPath, () => {});
        dialog.showErrorBox("Download Failed", err.message);
      });
  } else if (
    process.platform === "linux" &&
    assetName &&
    assetName.endsWith(".deb")
  ) {
    const downloadsDir = path.join(
      app.getPath("downloads"),
      "SpartanCode-Update",
    );
    if (!fs.existsSync(downloadsDir))
      fs.mkdirSync(downloadsDir, { recursive: true });
    const destPath = path.join(downloadsDir, assetName);
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Downloading Update",
      message: `Downloading ${assetName}...`,
      detail: "The .deb package will be saved to your Downloads folder.",
    });
    const file = fs.createWriteStream(destPath);
    https
      .get(assetUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          https.get(response.headers.location, (redirect) => {
            redirect.pipe(file);
            file.on("finish", () => {
              file.close();
              promptDebInstall(destPath, mainWindow);
            });
          });
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          promptDebInstall(destPath, mainWindow);
        });
      })
      .on("error", (err) => {
        fs.unlink(destPath, () => {});
        dialog.showErrorBox("Download Failed", err.message);
      });
  } else {
    shell.openExternal(
      `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
    );
  }
}

function promptDebInstall(debPath, mainWindow) {
  dialog
    .showMessageBox(mainWindow, {
      type: "info",
      title: "Update Downloaded",
      message: "New .deb package ready to install.",
      detail: `Package saved to: ${debPath}\n\nTo install, run:\nsudo dpkg -i "${debPath}"`,
      buttons: ["Open Terminal", "Later"],
    })
    .then(({ response }) => {
      if (response === 0) {
        const terminalCmd = process.env.TERM || "x-terminal-emulator";
        execFile(terminalCmd, [
          "-e",
          `bash -c "sudo dpkg -i  && echo Install complete. Press Enter. && read"`,
        ]);
      }
    });
}

function createDesktopUpdater(mainWindow) {
  let timer = null;

  async function checkForUpdates(silent = true) {
    try {
      const release = await fetchLatestRelease();
      if (!release || !release.version) {
        if (!silent) {
          dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "No Update Available",
            message: "You are running the latest version.",
          });
        }
        return null;
      }
      const currentVersion = app.getVersion();
      if (!isNewerVersion(currentVersion, release.version)) {
        if (!silent) {
          dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "No Update Available",
            message: `You are running v${currentVersion}, which is the latest version.`,
          });
        }
        return null;
      }
      const updateInfo = {
        currentVersion,
        latestVersion: release.version,
        body: release.body,
        assetUrl: release.assetUrl,
        assetName: release.assetName,
      };
      if (!silent) {
        const result = await dialog.showMessageBox(mainWindow, {
          type: "info",
          title: `Update Available: v${release.version}`,
          message: `A new version (v${release.version}) is available.`,
          detail: `Current: v${currentVersion}\nLatest: v${release.version}\n\n${release.body.slice(0, 500)}`,
          buttons: ["Download & Install", "Skip This Version", "Later"],
          defaultId: 0,
          cancelId: 2,
        });
        if (result.response === 0 && release.assetUrl) {
          installUpdate(release.assetUrl, release.assetName, mainWindow);
        }
      } else {
        const result = await dialog.showMessageBox(mainWindow, {
          type: "info",
          title: `Update Available: v${release.version}`,
          message: `A new version (v${release.version}) is available.`,
          detail: `Current: v${currentVersion}\nLatest: v${release.version}`,
          buttons: ["Update Now", "Skip This Version", "Later"],
          defaultId: 0,
          cancelId: 2,
        });
        if (result.response === 0 && release.assetUrl) {
          installUpdate(release.assetUrl, release.assetName, mainWindow);
        } else if (result.response === 1) {
          const settingsPath = path.join(
            app.getPath("userData"),
            "skipped-version.txt",
          );
          fs.writeFileSync(settingsPath, release.version);
        }
      }
      return updateInfo;
    } catch (err) {
      if (!silent) {
        dialog.showErrorBox("Update Check Failed", err.message);
      }
      return null;
    }
  }

  function startPeriodicCheck() {
    const settingsPath = path.join(
      app.getPath("userData"),
      "skipped-version.txt",
    );
    fetchLatestRelease().then((release) => {
      if (!release || !release.version) return;
      const currentVersion = app.getVersion();
      if (!isNewerVersion(currentVersion, release.version)) return;
      try {
        if (fs.existsSync(settingsPath)) {
          const skipped = fs.readFileSync(settingsPath, "utf8").trim();
          if (skipped === release.version) return;
        }
      } catch {}
      checkForUpdates(true);
    });
    timer = setInterval(() => {
      checkForUpdates(true);
    }, CHECK_INTERVAL_MS);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return { checkForUpdates, startPeriodicCheck, stop };
}

module.exports = { createDesktopUpdater };
