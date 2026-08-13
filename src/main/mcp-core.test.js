const assert = require("assert");
const test = require("node:test");
const { createCoreMcpRegistry } = require("./mcp-lite");
const { classifyCommand } = require("./policy-engine");

test("core MCP registry exposes safe workspace tools", async () => {
  const registry = createCoreMcpRegistry({
    workspacePath: "/tmp/project",
    gitStatus: async () => "## main",
    classifyCommand,
  });
  const listing = await registry.dispatch({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
  });
  assert.equal(listing.result.tools.length, 3);
  const preview = await registry.dispatch({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "terminal.preview", arguments: { command: "git push" } },
  });
  assert.equal(
    JSON.parse(preview.result.content[0].text).requiresApproval,
    true,
  );
});
