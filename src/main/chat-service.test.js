const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createChatService } = require("./chat-service");
const { createMissionStore } = require("./mission-store");

test("chat service persists user and assistant messages", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-chat-"));
  const chat = createChatService(
    createMissionStore(path.join(directory, "workspace.json")),
  );
  const result = chat.send("Help me build a local model picker");
  assert.equal(result.history.length, 2);
  assert.equal(result.history[0].role, "user");
  assert.match(result.response, /approval/);
  fs.rmSync(directory, { recursive: true, force: true });
});
