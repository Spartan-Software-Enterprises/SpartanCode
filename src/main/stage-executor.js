const fs = require("fs");
const { execFile } = require("child_process");

function runCommand(command, args, cwd, timeout = 120000) {
  return new Promise((resolve) => {
    execFile(command, args, { cwd, timeout }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        output: String(stdout || stderr || "").trim(),
        message: error ? String(stderr || error.message).trim() : "",
      });
    });
  });
}

function createLocalStageExecutor({
  getWorkspacePath,
  commandRunner = runCommand,
} = {}) {
  return async (stage) => {
    const workspacePath =
      typeof getWorkspacePath === "function" ? getWorkspacePath() : null;
    if (!workspacePath) {
      return {
        ok: true,
        message: "No workspace selected; local plan simulation retained",
      };
    }

    if (stage.status === "building") {
      const packagePath = `${workspacePath}/package.json`;
      return {
        ok: fs.existsSync(packagePath),
        message: fs.existsSync(packagePath)
          ? "Workspace manifest found; build handoff is ready"
          : "Workspace package.json was not found",
      };
    }

    if (stage.status === "verifying") {
      const packagePath = `${workspacePath}/package.json`;
      if (!fs.existsSync(packagePath))
        return {
          ok: true,
          message: "No test manifest; verification completed",
        };
      let manifest;
      try {
        manifest = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      } catch (error) {
        return { ok: false, message: `Invalid package.json: ${error.message}` };
      }
      if (!manifest.scripts || !manifest.scripts.test)
        return {
          ok: true,
          message: "No test script declared; verification completed",
        };
      const result = await commandRunner(
        process.platform === "win32" ? "npm.cmd" : "npm",
        ["test", "--", "--runInBand"],
        workspacePath,
      );
      return result.ok
        ? { ok: true, message: result.output || "Workspace tests passed" }
        : {
            ok: false,
            message:
              result.message || result.output || "Workspace tests failed",
          };
    }

    return { ok: true, message: "Verification artifact finalized" };
  };
}

module.exports = { createLocalStageExecutor, runCommand };
