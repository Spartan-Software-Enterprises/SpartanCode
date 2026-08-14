const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const {
  createCommitMessagePrompt,
  gitInitAt,
  gitStatusAt,
  normalizeCommitMessage,
  redactDiff,
} = require("./git");

test("Git workspace operations initialize and inspect a project", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-git-"));
  await gitInitAt(directory);
  const status = await gitStatusAt(directory);
  assert.match(status, /## No commits yet/);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("Git commit prompts redact sensitive diff lines and stay bounded", () => {
  const diff =
    "+++ b/config.js\n+OPENAI_API_KEY=super-secret\n+const value = 1;";
  const prompt = createCommitMessagePrompt(diff);
  assert.doesNotMatch(prompt, /super-secret/);
  assert.match(prompt, /Return only the commit subject line/);
  assert.equal(redactDiff("x".repeat(60_000)).length, 50_000);
});

test("provider commit messages are normalized to a safe subject", () => {
  assert.equal(
    normalizeCommitMessage("```text\nAdd local cache\n```"),
    "Add local cache",
  );
  assert.equal(normalizeCommitMessage('"Fix startup."'), "Fix startup");
  assert.throws(() => normalizeCommitMessage(""), /empty commit message/);
});
