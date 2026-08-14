const { spawn } = require("node:child_process");

const MAX_SPEECH_LENGTH = 2000;

function createVoiceOutput({
  platform = process.platform,
  spawnProcess = spawn,
} = {}) {
  const command =
    platform === "darwin"
      ? { executable: "say", args: (text) => [text] }
      : platform === "win32"
        ? {
            executable: "powershell.exe",
            args: (text) => [
              "-NoLogo",
              "-NoProfile",
              "-NonInteractive",
              "-ExecutionPolicy",
              "RemoteSigned",
              "-Command",
              "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak($args[0])",
              text,
            ],
          }
        : { executable: "spd-say", args: (text) => ["--", text] };

  return {
    async status() {
      let available = platform === "darwin" || platform === "win32";
      if (platform === "linux") {
        available = await new Promise((resolve) => {
          const child = spawnProcess(command.executable, ["--version"], {
            stdio: "ignore",
            windowsHide: true,
          });
          child.once("error", () => resolve(false));
          child.once("close", (code) => resolve(code === 0));
        });
      }
      return {
        available,
        platform,
        executable: command.executable,
        message:
          platform === "linux"
            ? available
              ? "Linux TTS is ready"
              : "Linux TTS requires spd-say to be installed"
            : "Native TTS adapter is available on this platform",
      };
    },
    speak(text) {
      if (typeof text !== "string" || !text.trim())
        throw new Error("Speech text is required");
      const bounded = text.trim().slice(0, MAX_SPEECH_LENGTH);
      const child = spawnProcess(command.executable, command.args(bounded), {
        stdio: "ignore",
        windowsHide: true,
      });
      return {
        ok: true,
        executable: command.executable,
        length: bounded.length,
        child,
      };
    },
  };
}

module.exports = { MAX_SPEECH_LENGTH, createVoiceOutput };
