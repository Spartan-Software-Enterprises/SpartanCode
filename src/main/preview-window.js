const LOCAL_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function normalizePreviewUrl(value) {
  if (typeof value !== "string" || !value.trim())
    throw new Error("A project preview URL is required");
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Project previews must use a valid HTTP(S) URL");
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Project previews must use HTTP or HTTPS");
  if (!LOCAL_PREVIEW_HOSTS.has(url.hostname.toLowerCase()))
    throw new Error(
      "Project previews are limited to local development servers",
    );
  return url.toString();
}

function createPreviewWindow({ BrowserWindow, shell, initialUrl }) {
  let previewWindow = null;
  let currentUrl = null;

  const open = (value) => {
    const url = normalizePreviewUrl(value);
    currentUrl = url;
    if (previewWindow && !previewWindow.isDestroyed()) {
      previewWindow.loadURL(url);
      previewWindow.show();
      previewWindow.focus();
      return { opened: true, url };
    }
    previewWindow = new BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 720,
      minHeight: 520,
      title: "SpartanCode — Project Preview",
      backgroundColor: "#f7f8fc",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    previewWindow.setMenuBarVisibility(false);
    previewWindow.webContents.setWindowOpenHandler(({ url: openedUrl }) => {
      try {
        shell?.openExternal(normalizePreviewUrl(openedUrl));
      } catch {
        // External navigation is intentionally ignored when it is not local.
      }
      return { action: "deny" };
    });
    previewWindow.webContents.on("will-navigate", (event, navigatedUrl) => {
      try {
        normalizePreviewUrl(navigatedUrl);
      } catch {
        event.preventDefault();
      }
    });
    previewWindow.on("closed", () => {
      previewWindow = null;
      currentUrl = null;
    });
    previewWindow.loadURL(url);
    return { opened: true, url };
  };

  if (initialUrl) open(initialUrl);
  return {
    open,
    close: () => {
      if (previewWindow && !previewWindow.isDestroyed()) previewWindow.close();
      return { closed: true };
    },
    status: () => ({
      open: Boolean(previewWindow && !previewWindow.isDestroyed()),
      url: currentUrl,
    }),
  };
}

module.exports = {
  LOCAL_PREVIEW_HOSTS,
  normalizePreviewUrl,
  createPreviewWindow,
};
