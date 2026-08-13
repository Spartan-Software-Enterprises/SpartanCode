const fs = require("fs");
const path = require("path");

function resolveInsideWorkspace(workspacePath, requestedPath = ".") {
  if (!workspacePath) throw new Error("No workspace selected");
  const root = path.resolve(workspacePath);
  const target = path.resolve(root, requestedPath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`))
    throw new Error("Path escapes the approved workspace");
  return target;
}

function listWorkspaceFiles(workspacePath, requestedPath = ".", limit = 100) {
  const directory = resolveInsideWorkspace(workspacePath, requestedPath);
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .slice(0, limit)
    .map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? "directory" : "file",
    }));
}

function readWorkspaceFile(workspacePath, requestedPath) {
  const filePath = resolveInsideWorkspace(workspacePath, requestedPath);
  return fs.readFileSync(filePath, "utf8");
}

module.exports = {
  resolveInsideWorkspace,
  listWorkspaceFiles,
  readWorkspaceFile,
};
