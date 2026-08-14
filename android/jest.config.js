module.exports = {
  preset: "jest-expo",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|expo-[^/]+|expo-modules-core|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@stablelib)/)",
    "/node_modules/react-native-reanimated/plugin/",
  ],
};
