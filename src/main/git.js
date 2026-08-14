const { execFile } = require("child_process");

const MAX_DIFF_BYTES = 50_000;

function redactDiff(diff) {
  return String(diff || "")
    .replace(
      /(^|\n)([^\n]*(?:api[_-]?key|token|password|secret|private[_-]?key)[^\n]*)(?=\n|$)/gi,
      "$1[redacted sensitive diff line]",
    )
    .slice(0, MAX_DIFF_BYTES);
}

function createCommitMessagePrompt(diff) {
  const safeDiff = redactDiff(diff);
  if (!safeDiff.trim()) throw new Error("No workspace changes are available");
  return [
    "Write one concise Git commit message for the diff below.",
    "Use imperative mood, describe the user-visible change, and keep the first line under 72 characters.",
    "Return only the commit subject line; do not use Markdown, quotes, or a period at the end.",
    "\nDIFF:\n",
    safeDiff,
  ].join("\n");
}

function normalizeCommitMessage(output) {
  const message = String(output || "")
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/, "")
    .split(/\r?\n/)[0]
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/[.]$/, "");
  if (!message) throw new Error("Provider returned an empty commit message");
  return message.slice(0, 72);
}

function runGit(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd }, (error, stdout, stderr) => {
      if (error) reject(Object.assign(error, { stdout, stderr }));
      else resolve(stdout || stderr);
    });
  });
}

function gitInit() {
  return runGit(["init"]);
}

function gitConfigure(user) {
  return runGit(["config", "user.name", user]);
}

function gitAdd() {
  return runGit(["add", "."]);
}

function gitCommit(message) {
  return runGit(["commit", "-m", message]);
}

function gitStatus() {
  return runGit(["status", "--short", "--branch"]);
}

function gitStatusAt(cwd) {
  return runGit(["status", "--short", "--branch"], cwd);
}

async function gitDiffAt(cwd) {
  try {
    return redactDiff(
      await runGit(["diff", "HEAD", "--no-ext-diff", "--unified=3"], cwd),
    );
  } catch {
    return redactDiff(
      await runGit(["diff", "--no-ext-diff", "--unified=3"], cwd),
    );
  }
}

function gitInitAt(cwd) {
  return runGit(["init"], cwd);
}

function gitAddAt(cwd) {
  return runGit(["add", "."], cwd);
}

function gitCommitAt(cwd, message) {
  return runGit(["commit", "-m", message], cwd);
}

module.exports = {
  gitInit,
  gitConfigure,
  gitAdd,
  gitCommit,
  gitStatus,
  gitStatusAt,
  gitDiffAt,
  gitInitAt,
  gitAddAt,
  gitCommitAt,
  createCommitMessagePrompt,
  normalizeCommitMessage,
  redactDiff,
};
