jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK: "AFTER_FIRST_UNLOCK",
  getItemAsync: jest.fn(
    async (key) => globalThis.__spartancodeSecureStore?.get(key) ?? null,
  ),
  setItemAsync: jest.fn(async (key, value) => {
    globalThis.__spartancodeSecureStore ??= new Map();
    globalThis.__spartancodeSecureStore.set(key, value);
  }),
}));
globalThis.__spartancodeSecureStore = new Map();
jest.mock("expo-speech-recognition", () => ({
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
    start: jest.fn(),
    stop: jest.fn(),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));
