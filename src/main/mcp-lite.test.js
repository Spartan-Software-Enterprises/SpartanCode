const assert = require("assert");
const test = require("node:test");
const { createMcpLiteRegistry } = require("./mcp-lite");

test("MCP Lite discovers and dispatches tools", async () => {
  const registry = createMcpLiteRegistry();
  registry.registerTool("echo", "Returns the supplied value", ({ value }) => ({
    value,
  }));
  const listing = await registry.dispatch({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
  });
  assert.equal(listing.result.tools[0].name, "echo");
  const result = await registry.dispatch({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "echo", arguments: { value: "ok" } },
  });
  assert.match(result.result.content[0].text, /ok/);
});
