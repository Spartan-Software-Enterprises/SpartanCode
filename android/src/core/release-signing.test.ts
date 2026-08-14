// eslint-disable-next-line @typescript-eslint/no-var-requires
const signingPlugin = require("../../plugins/withReleaseSigning");

describe("Android release signing configuration", () => {
  it("fails closed instead of falling back to the debug keystore", () => {
    const block = signingPlugin.createReleaseSigningBlock();

    expect(block).toContain("throw new GradleException");
    expect(block).toContain("Release signing requires keystore.properties");
    expect(block).not.toContain(
      "storeFile file('debug.keystore')\n                storePassword 'android'\n                keyAlias 'androiddebugkey'",
    );
  });
});
