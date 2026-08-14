const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  importVisualStudioProject,
} = require("./visual-studio-project-importer");

test("imports solution and project metadata without returning values or executing MSBuild", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-vs-"));
  fs.writeFileSync(
    path.join(root, "Game.sln"),
    'Project("{guid}") = "Game", "Game.vcxproj", "{project-guid}"\nEndProject\n',
  );
  fs.writeFileSync(
    path.join(root, "Game.vcxproj"),
    '<?xml version="1.0"?><Project><PropertyGroup><TargetFramework>secret</TargetFramework></PropertyGroup><ItemGroup><ClCompile Include="secret.cpp" /></ItemGroup></Project>',
  );
  const result = importVisualStudioProject(root);
  assert.equal(result.execution, "read-only");
  assert.equal(result.credentials, false);
  assert.equal(result.files.solutions[0].projects[0].name, "Game");
  assert.ok(
    result.files.projects[0].summary.elementNames.includes("ClCompile"),
  );
  assert.equal(JSON.stringify(result).includes("secret"), false);
  fs.rmSync(root, { recursive: true, force: true });
});

test("rejects unsafe XML, symlinked metadata, and relative paths", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-vs-"));
  fs.writeFileSync(
    path.join(root, "Game.csproj"),
    '<!DOCTYPE Project [<!ENTITY x SYSTEM "secret">]><Project/>',
  );
  assert.throws(
    () => importVisualStudioProject(root),
    /Unsafe Visual Studio XML/,
  );
  fs.rmSync(path.join(root, "Game.csproj"));
  fs.writeFileSync(path.join(root, "Game.csproj"), "<Project>");
  assert.throws(
    () => importVisualStudioProject(root),
    /Invalid Visual Studio XML/,
  );
  fs.rmSync(path.join(root, "Game.csproj"));
  fs.writeFileSync(
    path.join(root, "real.csproj"),
    '<?xml version="1.0"?><Project/>',
  );
  fs.symlinkSync(
    path.join(root, "real.csproj"),
    path.join(root, "Game.csproj"),
  );
  assert.throws(() => importVisualStudioProject(root), /symlink/);
  assert.throws(
    () => importVisualStudioProject("relative"),
    /must be absolute/,
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test("reports a workspace without Visual Studio project files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-vs-empty-"));
  const result = importVisualStudioProject(root);
  assert.equal(result.present, false);
  fs.rmSync(root, { recursive: true, force: true });
});
