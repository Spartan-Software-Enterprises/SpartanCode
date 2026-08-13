const { getCapabilities } = require("./capabilities");

function createVoiceService() {
  return {
    status() {
      const capabilities = getCapabilities();
      const available =
        capabilities.voiceCapture.status === "available" ||
        capabilities.voiceDictation.status === "available";
      return {
        available,
        mode:
          capabilities.voiceDictation.status === "available"
            ? "google-cloud"
            : "native",
        message: available
          ? "Voice input is ready"
          : "Install a supported voice runtime to enable dictation",
      };
    },
    start() {
      const result = this.status();
      if (!result.available) throw new Error(result.message);
      return result;
    },
  };
}

module.exports = { createVoiceService };
