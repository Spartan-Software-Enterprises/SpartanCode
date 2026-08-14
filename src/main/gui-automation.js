const os = require("node:os");
const { spawn } = require("node:child_process");

function commandAvailable(command) {
  return new Promise((resolve) => {
    const child = spawn(command, ["--version"], {
      stdio: "ignore",
      windowsHide: true,
    });
    child.once("error", () => resolve(false));
    child.once("close", (code) => resolve(code === 0));
  });
}

function createGuiAutomation({ platform = process.platform } = {}) {
  return {
    async status() {
      const windows = platform === "win32";
      const pyautogui = await commandAvailable("pyautogui");
      return {
        platform: os.platform(),
        windows,
        uiAutomation: windows
          ? "available-via-win32-adapter"
          : "platform-unavailable",
        pyautogui: pyautogui ? "available" : "unavailable",
        execution: "review-required",
        message:
          "GUI actions require an explicit reviewed adapter and visible audit evidence",
      };
    },
    execute() {
      return {
        ok: false,
        status: "review-required",
        message:
          "Arbitrary GUI control is not enabled; use a reviewed, capability-specific adapter",
      };
    },
  };
}

module.exports = { createGuiAutomation };
