const modules = {
  sqlite: "better-sqlite3",
  modelGateway: "@ai-sdk/provider",
  chat: "botfather",
  voiceCapture: "node-speech-recognition",
  voiceDictation: "@google-cloud/voice",
  remoteSsh: "ssh2",
};

function getCapabilities() {
  return Object.fromEntries(
    Object.entries(modules).map(([id, moduleName]) => {
      try {
        require.resolve(moduleName);
        return [id, { status: "available", module: moduleName }];
      } catch {
        return [id, { status: "planned", module: moduleName }];
      }
    }),
  );
}

module.exports = { getCapabilities };
