const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { importXcodeProject } = require("./xcode-project-importer");

test("imports Xcode and Swift Package metadata without signing or toolchain execution", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-xcode-"));
  fs.mkdirSync(path.join(root, "Game.xcodeproj"));
  fs.writeFileSync(
    path.join(root, "Game.xcodeproj/project.pbxproj"),
    "productName = Game; buildSettings = { }; 0123456789ABCDEF01234567;",
  );
  fs.writeFileSync(
    path.join(root, "Package.swift"),
    "// swift-tools-version: 5.9\nlet products: [String] = []\nlet targets: [String] = []",
  );
  const result = importXcodeProject(root);
  assert.equal(result.execution, "read-only");
  assert.equal(result.credentials, false);
  assert.equal(result.files.xcodeProjects[0].summary.productNames[0], "Game");
  assert.equal(result.files.swiftPackages[0].summary.toolsVersion, "5.9");
  fs.rmSync(root, { recursive: true, force: true });
});

test("rejects signing metadata, symlinked projects, and relative paths", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-xcode-"));
  fs.mkdirSync(path.join(root, "Bad.xcodeproj"));
  fs.writeFileSync(
    path.join(root, "Bad.xcodeproj/project.pbxproj"),
    "CODE_SIGN_IDENTITY = secret;",
  );
  assert.throws(() => importXcodeProject(root), /signing metadata/);
  fs.rmSync(path.join(root, "Bad.xcodeproj"), { recursive: true, force: true });
  fs.mkdirSync(path.join(root, "Real.xcodeproj"));
  fs.writeFileSync(
    path.join(root, "Real.xcodeproj/project.pbxproj"),
    "productName = Real;",
  );
  fs.symlinkSync(
    path.join(root, "Real.xcodeproj"),
    path.join(root, "Link.xcodeproj"),
  );
  assert.throws(() => importXcodeProject(root), /unavailable or symlinked/);
  assert.throws(() => importXcodeProject("relative"), /must be absolute/);
  fs.rmSync(root, { recursive: true, force: true });
});

test("reports a folder without Xcode metadata", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-xcode-empty-"),
  );
  assert.equal(importXcodeProject(root).present, false);
  fs.rmSync(root, { recursive: true, force: true });
});
