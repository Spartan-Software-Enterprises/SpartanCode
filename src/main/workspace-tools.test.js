const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const {
  listWorkspaceFiles,
  readWorkspaceFile,
  resolveInsideWorkspace,
} = require("./workspace-tools");

test("workspace tools stay inside the approved root", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-workspace-"),
  );
  fs.writeFileSync(path.join(directory, "README.md"), "hello");
  assert.equal(listWorkspaceFiles(directory)[0].name, "README.md");
  assert.equal(readWorkspaceFile(directory, "README.md"), "hello");
  assert.throws(
    () => resolveInsideWorkspace(directory, "../secret"),
    /escapes/,
  );
  fs.rmSync(directory, { recursive: true, force: true });
});

test("workspace tools reject symlink escapes", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-workspace-"),
  );
  const outside = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-outside-"),
  );
  fs.writeFileSync(path.join(outside, "secret.txt"), "secret");
  try {
    fs.symlinkSync(outside, path.join(directory, "linked"), "junction");
    assert.throws(
      () => readWorkspaceFile(directory, "linked/secret.txt"),
      /symlink/,
    );
  } catch (error) {
    if (error.code !== "EPERM") throw error;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});
