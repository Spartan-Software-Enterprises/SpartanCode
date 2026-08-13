const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { gitInitAt, gitStatusAt } = require("./git");

test("Git workspace operations initialize and inspect a project", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-git-"));
  await gitInitAt(directory);
  const status = await gitStatusAt(directory);
  assert.match(status, /## No commits yet/);
  fs.rmSync(directory, { recursive: true, force: true });
});
