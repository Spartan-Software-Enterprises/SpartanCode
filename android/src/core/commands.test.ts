import { ANDROID_SLASH_COMMANDS, resolveAndroidSlash } from "./commands";

describe("Android Slash Commands", () => {
  it("provides available slash commands", () => {
    expect(ANDROID_SLASH_COMMANDS.length).toBeGreaterThanOrEqual(5);
    const cmds = ANDROID_SLASH_COMMANDS.map((c) => c.command);
    expect(cmds).toContain("/plan");
    expect(cmds).toContain("/build");
    expect(cmds).toContain("/verify");
  });

  it("resolves valid slash commands with arguments", () => {
    const res = resolveAndroidSlash("/plan create SQLite schema");
    expect(res.matched).toBe(true);
    expect(res.command).toBe("/plan");
    expect(res.args).toBe("create SQLite schema");
    expect(res.mode).toBe("architect");
  });

  it("returns unmatched for non-slash messages", () => {
    expect(resolveAndroidSlash("plain message").matched).toBe(false);
  });
});
