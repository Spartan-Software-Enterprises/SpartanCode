const { create } = require("@ai-sdk/provider");

function createModelGateway() {
  const gateway = create({
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o-mini",
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: "claude-3-haiku-20240307",
      },
    },
    default: "openai",
  });

  return gateway;
}

module.exports = { createModelGateway };
