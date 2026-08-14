const assert = require("node:assert/strict");
const test = require("node:test");
const {
  normalizeAdapterManifest,
  validateAdapterManifests,
} = require("./adapter-manifest");

const base = {
  schemaVersion: 1,
  id: "unreal-pc",
  kind: "engine",
  name: "Unreal Engine PC adapter",
  adapterVersion: "1.0.0",
  status: "requires_authorized_access",
  hosts: ["windows"],
  targets: { windows: "available", xbox: "requires_authorized_access" },
  operations: ["validate", "compile", "cook", "package", "test"],
  requirements: ["unreal-5", "d3d12"],
  permissions: [],
  execution: { mode: "external-process", shell: false, network: false },
  provenance: { source: "bundled", license: "SpartanCode" },
  testCoverage: ["manifest-validation"],
};

test("adapter manifests normalize a bounded capability contract", () => {
  const manifest = normalizeAdapterManifest(base);
  assert.equal(manifest.id, "unreal-pc");
  assert.equal(manifest.targets.xbox, "requires_authorized_access");
  assert.equal(manifest.execution.shell, false);
});

test("adapter manifests reject unsafe or malformed declarations", () => {
  assert.throws(
    () => normalizeAdapterManifest({ ...base, id: "../escape" }),
    /Adapter id is invalid/,
  );
  assert.throws(
    () =>
      normalizeAdapterManifest({
        ...base,
        execution: { mode: "declarative", shell: true },
      }),
    /Declarative adapters cannot request shell execution/,
  );
  assert.throws(
    () =>
      normalizeAdapterManifest({
        ...base,
        execution: { mode: "external-process", credentials: true },
      }),
    /secret-reference permission/,
  );
});

test("adapter validation rejects duplicate identifiers", () => {
  assert.throws(
    () => validateAdapterManifests([base, { ...base, name: "duplicate" }]),
    /Adapter ids must be unique/,
  );
});

test("adapter manifest accepts the declarative JetBrains importer", () => {
  const manifest = normalizeAdapterManifest({
    ...base,
    id: "jetbrains-project",
    kind: "connector",
    name: "JetBrains project importer",
    status: "available",
    hosts: ["windows", "macos", "linux"],
    targets: { intellij: "available", rider: "available", clion: "available" },
    operations: ["inspect", "import"],
    requirements: ["jetbrains-project-directory"],
    execution: {
      mode: "declarative",
      shell: false,
      network: false,
      credentials: false,
    },
    testCoverage: [
      "xml-metadata",
      "redaction",
      "symlink-rejection",
      "size-bounds",
    ],
  });
  assert.equal(manifest.execution.network, false);
  assert.equal(manifest.targets.rider, "available");
});

test("adapter manifest accepts the declarative Visual Studio importer", () => {
  const manifest = normalizeAdapterManifest({
    ...base,
    id: "visual-studio-project",
    kind: "connector",
    name: "Visual Studio project importer",
    status: "available",
    hosts: ["windows", "linux", "macos"],
    targets: { "visual-studio": "available", msbuild: "unsupported" },
    operations: ["inspect", "import"],
    requirements: ["visual-studio-project-directory"],
    execution: {
      mode: "declarative",
      shell: false,
      network: false,
      credentials: false,
    },
    testCoverage: ["solution-metadata", "xml-redaction", "symlink-rejection"],
  });
  assert.equal(manifest.execution.shell, false);
  assert.equal(manifest.targets["visual-studio"], "available");
});

test("adapter manifest accepts the declarative Eclipse importer", () => {
  const manifest = normalizeAdapterManifest({
    ...base,
    id: "eclipse-project",
    kind: "connector",
    name: "Eclipse project importer",
    status: "available",
    hosts: ["windows", "macos", "linux"],
    targets: { eclipse: "available", maven: "available", gradle: "available" },
    operations: ["inspect", "import"],
    requirements: ["eclipse-project-directory"],
    execution: {
      mode: "declarative",
      shell: false,
      network: false,
      credentials: false,
    },
    testCoverage: ["xml-metadata", "classpath-bounds", "symlink-rejection"],
  });
  assert.equal(manifest.execution.network, false);
  assert.equal(manifest.targets.eclipse, "available");
});
