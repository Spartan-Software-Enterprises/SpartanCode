const { getApiProviderStatus } = require("./api-providers");

function getProviderStatus(environment = process.env) {
  return [
    {
      id: "local",
      name: "Local GGUF",
      status: "preferred",
      detail: "Offline-first",
    },
    ...getApiProviderStatus(environment),
  ];
}

module.exports = { getProviderStatus };
