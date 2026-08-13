const { execFile } = require("child_process");

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
  gitInitAt,
  gitAddAt,
  gitCommitAt,
};
