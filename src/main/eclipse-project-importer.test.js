const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { importEclipseProject } = require("./eclipse-project-importer");

test("imports Eclipse project and classpath metadata without executing Java tooling", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-eclipse-"));
  fs.writeFileSync(
    path.join(root, ".project"),
    '<?xml version="1.0"?><projectDescription><name>Game</name><buildSpec><buildCommand><name>org.eclipse.jdt.core.javabuilder</name></buildCommand></buildSpec></projectDescription>',
  );
  fs.writeFileSync(
    path.join(root, ".classpath"),
    '<?xml version="1.0"?><classpath><classpathentry kind="src" path="src"/><classpathentry kind="con" path="secret"/></classpath>',
  );
  fs.writeFileSync(path.join(root, "pom.xml"), "");
  const result = importEclipseProject(root);
  assert.equal(result.execution, "read-only");
  assert.equal(result.credentials, false);
  assert.equal(result.files[".classpath"].summary.entryCount, 2);
  assert.deepEqual(result.files[".classpath"].summary.kinds, ["con", "src"]);
  assert.equal(result.buildSystems.maven, true);
  assert.equal(JSON.stringify(result).includes("secret"), false);
  fs.rmSync(root, { recursive: true, force: true });
});

test("rejects unsafe XML, symlinked metadata, and relative paths", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-eclipse-"));
  fs.writeFileSync(
    path.join(root, ".project"),
    '<!DOCTYPE project [<!ENTITY x SYSTEM "secret">]><projectDescription/>',
  );
  assert.throws(() => importEclipseProject(root), /Unsafe Eclipse XML/);
  fs.rmSync(path.join(root, ".project"));
  fs.writeFileSync(
    path.join(root, "real.project"),
    '<?xml version="1.0"?><projectDescription/>',
  );
  fs.symlinkSync(path.join(root, "real.project"), path.join(root, ".project"));
  assert.throws(() => importEclipseProject(root), /symlink/);
  assert.throws(() => importEclipseProject("relative"), /must be absolute/);
  fs.rmSync(root, { recursive: true, force: true });
});

test("reports an ordinary folder without Eclipse metadata", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-eclipse-empty-"),
  );
  const result = importEclipseProject(root);
  assert.equal(result.present, false);
  fs.rmSync(root, { recursive: true, force: true });
});
