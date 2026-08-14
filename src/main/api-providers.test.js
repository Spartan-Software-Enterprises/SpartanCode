const assert = require("node:assert/strict");
const test = require("node:test");
const { createApiGateway, getApiProviderStatus } = require("./api-providers");

test("API provider catalog covers major agent APIs without exposing keys", () => {
  const status = getApiProviderStatus({ OPENAI_API_KEY: "secret" });
  assert.equal(
    status.find((item) => item.id === "openai").status,
    "configured",
  );
  assert.ok(status.some((item) => item.id === "google"));
  assert.ok(status.some((item) => item.id === "openrouter"));
  assert.equal(JSON.stringify(status).includes("secret"), false);
});

test("API gateway sends OpenAI-compatible requests and normalizes output", async () => {
  let request;
  const gateway = createApiGateway({
    environment: { groq: "ignored", GROQ_API_KEY: "secret" },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "ready" } }] }),
      };
    },
  });
  const result = await gateway.generate("groq", {
    prompt: "hello",
    maxTokens: 4,
  });
  assert.equal(result.output, "ready");
  assert.equal(JSON.parse(request.options.body).messages[0].content, "hello");
  assert.equal(request.options.headers.Authorization, "Bearer secret");
});

test("API gateway rejects missing credentials and malformed requests", async () => {
  const gateway = createApiGateway({ environment: {} });
  await assert.rejects(
    () => gateway.generate("openai", { prompt: "hello" }),
    /not configured/,
  );
  await assert.rejects(
    () => gateway.generate("openai", { prompt: "" }),
    /not configured/,
  );
});
