const MCP_VERSION = "2024-11-05";

function createMcpLiteRegistry() {
  const tools = new Map();

  return {
    registerTool(name, description, handler) {
      if (!name || typeof handler !== "function")
        throw new TypeError("MCP Lite tools require a name and handler");
      tools.set(name, { name, description: description || "", handler });
    },
    listTools() {
      return [...tools.values()].map(({ name, description }) => ({
        name,
        description,
      }));
    },
    async dispatch(request) {
      if (!request || request.jsonrpc !== "2.0" || request.id === undefined)
        throw new Error("Invalid MCP Lite request");
      if (request.method === "initialize")
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: { protocolVersion: MCP_VERSION, capabilities: { tools: {} } },
        };
      if (request.method === "tools/list")
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: { tools: this.listTools() },
        };
      if (request.method !== "tools/call")
        throw new Error(`Unsupported MCP Lite method: ${request.method}`);
      const tool = tools.get(request.params && request.params.name);
      if (!tool)
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32602, message: "Unknown tool" },
        };
      const value = await tool.handler(request.params.arguments || {});
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: { content: [{ type: "text", text: JSON.stringify(value) }] },
      };
    },
  };
}

function createCoreMcpRegistry({
  workspacePath,
  gitStatus,
  classifyCommand,
  listFiles,
  readFile,
}) {
  const registry = createMcpLiteRegistry();
  registry.registerTool(
    "workspace.info",
    "Describe the approved workspace",
    () => ({ workspacePath: workspacePath || null }),
  );
  registry.registerTool(
    "workspace.list",
    "List files inside the approved workspace",
    ({ path }) => listFiles(workspacePath, path || "."),
  );
  registry.registerTool(
    "workspace.read",
    "Read a text file inside the approved workspace",
    ({ path }) => readFile(workspacePath, path),
  );
  registry.registerTool(
    "git.status",
    "Inspect workspace Git status",
    async () => ({
      output: workspacePath
        ? await gitStatus(workspacePath)
        : "No workspace selected",
    }),
  );
  registry.registerTool(
    "terminal.preview",
    "Classify a command before approval",
    ({ command }) => classifyCommand(command),
  );
  return registry;
}

module.exports = { MCP_VERSION, createMcpLiteRegistry, createCoreMcpRegistry };
