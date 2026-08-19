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
jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: (props) => React.createElement("View", props),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 0, height: 0 }),
  };
});
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  NavigationContainer: ({ children }) => children,
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));
jest.mock("@react-navigation/bottom-tabs", () => {
  const React = require("react");
  return {
    createBottomTabNavigator: () => {
      const Screen = ({ name, component: Component }) =>
        React.createElement(Component, { name });
      const Navigator = ({ children, screenOptions }) => {
        return React.createElement("View", { testID: "tab-navigator" }, children);
      };
      Navigator.Screen = Screen;
      return { Navigator, Screen };
    },
  };
});
