function getProviderStatus(environment = process.env) {
  return [
    {
      id: "local",
      name: "Local GGUF",
      status: "preferred",
      detail: "Offline-first",
    },
    {
      id: "openai",
      name: "OpenAI",
      status: environment.OPENAI_API_KEY ? "configured" : "not configured",
      detail: "Cloud fallback",
    },
    {
      id: "anthropic",
      name: "Anthropic",
      status: environment.ANTHROPIC_API_KEY ? "configured" : "not configured",
      detail: "Cloud fallback",
    },
  ];
}

module.exports = { getProviderStatus };
