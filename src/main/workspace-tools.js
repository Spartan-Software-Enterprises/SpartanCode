const fs = require("fs");
const path = require("path");

function verifyWorkspace(workspacePath) {
  if (!workspacePath)
    return { verified: false, reason: "No workspace selected" };
  try {
    const root = path.resolve(workspacePath);
    const stat = fs.statSync(root);
    if (!stat.isDirectory())
      return { verified: false, reason: "Workspace root is not a directory" };
    const canonicalRoot = fs.realpathSync(root);
    return {
      verified: true,
      root,
      canonicalRoot,
      symlinkedRoot: root !== canonicalRoot,
    };
  } catch {
    return { verified: false, reason: "Workspace root is unavailable" };
  }
}

function resolveInsideWorkspace(workspacePath, requestedPath = ".") {
  if (!workspacePath) throw new Error("No workspace selected");
  const verification = verifyWorkspace(workspacePath);
  if (!verification.verified) throw new Error(verification.reason);
  const { root, canonicalRoot } = verification;
  const target = path.resolve(root, requestedPath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`))
    throw new Error("Path escapes the approved workspace");
  const resolvedTarget = fs.realpathSync(target);
  if (
    resolvedTarget !== canonicalRoot &&
    !resolvedTarget.startsWith(`${canonicalRoot}${path.sep}`)
  )
    throw new Error("Path escapes the approved workspace through a symlink");
  return target;
}

function resolveWritableInsideWorkspace(workspacePath, requestedPath = ".") {
  if (!workspacePath) throw new Error("No workspace selected");
  const verification = verifyWorkspace(workspacePath);
  if (!verification.verified) throw new Error(verification.reason);
  const { root, canonicalRoot } = verification;
  const target = path.resolve(root, requestedPath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`))
    throw new Error("Path escapes the approved workspace");

  let existingParent = target === root ? root : path.dirname(target);
  while (!fs.existsSync(existingParent) && existingParent !== root)
    existingParent = path.dirname(existingParent);
  const canonicalParent = fs.realpathSync(existingParent);
  if (
    canonicalParent !== canonicalRoot &&
    !canonicalParent.startsWith(`${canonicalRoot}${path.sep}`)
  )
    throw new Error("Path escapes the approved workspace through a symlink");
  if (fs.existsSync(target)) {
    const canonicalTarget = fs.realpathSync(target);
    if (
      canonicalTarget !== canonicalRoot &&
      !canonicalTarget.startsWith(`${canonicalRoot}${path.sep}`)
    )
      throw new Error("Path escapes the approved workspace through a symlink");
  }
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
  verifyWorkspace,
  resolveInsideWorkspace,
  resolveWritableInsideWorkspace,
  listWorkspaceFiles,
  readWorkspaceFile,
};
