const { execFile } = require("node:child_process");

const READ_ONLY_COMMANDS = new Set([
  "Get-ComputerInfo | Select-Object CsName,WindowsVersion,OsArchitecture",
  "Get-Service | Select-Object -First 100 Name,Status,StartType",
  "Get-NetAdapter | Select-Object Name,Status,LinkSpeed,MacAddress",
  "Get-Process | Select-Object -First 100 Name,Id,CPU",
]);

function createWindowsAutomation({
  platform = process.platform,
  runner = (file, args, options, callback) =>
    execFile(file, args, options, callback),
} = {}) {
  const available = platform === "win32";
  const status = () => ({
    id: "windows-system",
    platform,
    status: available ? "available" : "unavailable",
    capabilities: available
      ? ["powershell-read", "process-list", "service-list", "network-list"]
      : [],
    message: available
      ? "Windows PowerShell system adapter is available"
      : "Windows system automation is available only on Windows",
  });
  const execute = (request = {}) => {
    if (!available)
      return {
        ok: false,
        code: "platform-unavailable",
        message: "Windows system automation is unavailable on this platform",
      };
    if (!request || typeof request !== "object")
      return {
        ok: false,
        code: "invalid-request",
        message: "System request is required",
      };
    const command =
      typeof request.command === "string" ? request.command.trim() : "";
    if (!READ_ONLY_COMMANDS.has(command))
      return {
        ok: false,
        code: "approval-required",
        message:
          "Only bounded read-only PowerShell commands are available through this boundary",
      };
    return new Promise((resolve) => {
      runner(
        "powershell.exe",
        [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "RemoteSigned",
          "-Command",
          command,
        ],
        { windowsHide: true, timeout: 30_000, maxBuffer: 2 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error)
            return resolve({
              ok: false,
              code: "system-failed",
              message: String(stderr || error.message).slice(0, 1000),
            });
          resolve({
            ok: true,
            output: String(stdout || "").slice(0, 2 * 1024 * 1024),
          });
        },
      );
    });
  };
  return { status, execute };
}

module.exports = { READ_ONLY_COMMANDS, createWindowsAutomation };
