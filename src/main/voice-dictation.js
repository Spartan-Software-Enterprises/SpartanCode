const { recognize } = require("@google-cloud/voice");

function createVoiceDictation() {
  const client = recognize({
    encoding: "LINEAR16",
    sampleRateHertz: 16000,
    languageCode: "en-US",
  });

  return client;
}

module.exports = { createVoiceDictation };
