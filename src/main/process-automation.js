const { spawn } = require("node:child_process");

const MAX_ARGUMENTS = 32;
const MAX_ARGUMENT_LENGTH = 512;

function createProcessAutomation({
  environment = process.env,
  spawnProcess = spawn,
  platform = process.platform,
} = {}) {
  const allowlist = () =>
    String(environment.SPARTANCODE_PROCESS_ALLOWLIST || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

  return {
    status() {
      const configured = allowlist();
      return {
        platform,
        available: true,
        execution: configured.length ? "allowlisted" : "review-required",
        allowlist: configured,
        shell: false,
        message: configured.length
          ? "Only explicitly allowlisted executables may be launched"
          : "Configure an executable allowlist before process launch is enabled",
      };
    },
    launch(request = {}) {
      if (!request || typeof request !== "object")
        throw new Error("Process request is required");
      const executable = String(request.executable || "").trim();
      const args = request.args === undefined ? [] : request.args;
      if (!executable || executable.length > MAX_ARGUMENT_LENGTH)
        throw new Error("A bounded executable is required");
      if (
        !Array.isArray(args) ||
        args.length > MAX_ARGUMENTS ||
        args.some(
          (arg) => typeof arg !== "string" || arg.length > MAX_ARGUMENT_LENGTH,
        )
      )
        throw new Error("Process arguments are invalid or too long");
      if (!allowlist().includes(executable))
        return {
          ok: false,
          status: "review-required",
          message: `Executable is not allowlisted: ${executable}`,
        };
      const child = spawnProcess(executable, args, {
        shell: false,
        stdio: "ignore",
        windowsHide: true,
      });
      if (child && typeof child.once === "function") {
        child.once("error", () => {});
      }
      return {
        ok: true,
        status: "started",
        executable,
        pid: child.pid || null,
      };
    },
  };
}

module.exports = {
  MAX_ARGUMENTS,
  MAX_ARGUMENT_LENGTH,
  createProcessAutomation,
};
