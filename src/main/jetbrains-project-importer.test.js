const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { importJetbrainsProject } = require("./jetbrains-project-importer");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-jetbrains-"));
  fs.mkdirSync(path.join(root, ".idea", "runConfigurations"), {
    recursive: true,
  });
  fs.writeFileSync(path.join(root, "misc.xml"), "outside");
  fs.writeFileSync(path.join(root, "Sample.sln"), "");
  fs.writeFileSync(path.join(root, "CMakeLists.txt"), "");
  fs.writeFileSync(
    path.join(root, ".idea/misc.xml"),
    '<?xml version="1.0"?><project><component name="ProjectRootManager" /></project>',
  );
  fs.writeFileSync(
    path.join(root, ".idea/modules.xml"),
    '<?xml version="1.0"?><project><component name="ProjectModuleManager"><module name="Sample" type="CPP_MODULE" /></component></project>',
  );
  fs.writeFileSync(
    path.join(root, ".idea/runConfigurations/App.xml"),
    '<?xml version="1.0"?><component><configuration name="App" type="Application"><option name="PROGRAM_PARAMETERS" value="secret-token" /></configuration></component>',
  );
  fs.writeFileSync(
    path.join(root, "Sample.iml"),
    '<?xml version="1.0"?><module type="JAVA_MODULE" name="Sample" />',
  );
  return root;
}

test("imports bounded JetBrains metadata for Rider and CLion projects", () => {
  const root = fixture();
  const result = importJetbrainsProject(root);
  assert.deepEqual(result.products, ["rider", "clion"]);
  assert.equal(result.execution, "read-only");
  assert.equal(result.credentials, false);
  assert.equal(
    result.files.runConfigurations[0].summary.configurations[0].name,
    "App",
  );
  assert.equal(result.files.modules[0].summary.modules[0].type, "JAVA_MODULE");
  assert.equal(JSON.stringify(result).includes("secret-token"), false);
  fs.rmSync(root, { recursive: true, force: true });
});

test("rejects unsafe XML, symlinked metadata, and non-absolute paths", () => {
  const root = fixture();
  fs.writeFileSync(
    path.join(root, ".idea/gradle.xml"),
    '<!DOCTYPE project [<!ENTITY x SYSTEM "secret">]><project/>',
  );
  assert.throws(() => importJetbrainsProject(root), /Unsafe JetBrains XML/);
  fs.rmSync(path.join(root, ".idea/gradle.xml"));
  fs.rmSync(path.join(root, ".idea/misc.xml"));
  fs.symlinkSync(
    path.join(root, "Sample.iml"),
    path.join(root, ".idea/misc.xml"),
  );
  assert.throws(() => importJetbrainsProject(root), /symlink/);
  assert.throws(() => importJetbrainsProject("relative"), /must be absolute/);
  fs.rmSync(root, { recursive: true, force: true });
});

test("reports a project without .idea without executing or writing", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-jetbrains-empty-"),
  );
  const before = fs.readdirSync(root);
  const result = importJetbrainsProject(root);
  assert.equal(result.files.ideaDirectory.present, false);
  assert.deepEqual(fs.readdirSync(root), before);
  fs.rmSync(root, { recursive: true, force: true });
});
