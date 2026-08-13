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
