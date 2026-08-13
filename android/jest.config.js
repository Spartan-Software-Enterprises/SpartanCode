module.exports = {
  preset: "jest-expo",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  setupFiles: ["<rootDir>/jest.setup.js"],
};
