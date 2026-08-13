const { SpeechRecognition } = require("node-speech-recognition");

function createVoiceCapture() {
  const recognition = new SpeechRecognition();

  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    console.log(`Voice input: ${transcript}`);
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
  };

  return recognition;
}

module.exports = { createVoiceCapture };
