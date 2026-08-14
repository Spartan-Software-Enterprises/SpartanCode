const API_VERSION = "2022-11-28";
const MAX_PROMPT_BYTES = 100_000;
const MAX_OUTPUT_TOKENS = 16_384;

const apiProviders = [
  {
    id: "openai",
    name: "OpenAI",
    key: "OPENAI_API_KEY",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    key: "ANTHROPIC_API_KEY",
    endpoint: "https://api.anthropic.com/v1/messages",
    model: "claude-3-5-haiku-latest",
    kind: "anthropic",
  },
  {
    id: "google",
    name: "Google Gemini",
    key: "GOOGLE_API_KEY",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    model: "gemini-2.0-flash",
    kind: "google",
  },
  {
    id: "mistral",
    name: "Mistral",
    key: "MISTRAL_API_KEY",
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    model: "mistral-small-latest",
  },
  {
    id: "groq",
    name: "Groq",
    key: "GROQ_API_KEY",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
  },
  {
    id: "xai",
    name: "xAI",
    key: "XAI_API_KEY",
    endpoint: "https://api.x.ai/v1/chat/completions",
    model: "grok-3-mini",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    key: "DEEPSEEK_API_KEY",
    endpoint: "https://api.deepseek.com/chat/completions",
    model: "deepseek-chat",
  },
  {
    id: "together",
    name: "Together AI",
    key: "TOGETHER_API_KEY",
    endpoint: "https://api.together.xyz/v1/chat/completions",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    key: "OPENROUTER_API_KEY",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model: "openai/gpt-4o-mini",
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    key: "FIREWORKS_API_KEY",
    endpoint: "https://api.fireworks.ai/inference/v1/chat/completions",
    model: "accounts/fireworks/models/llama-v3p1-8b-instruct",
  },
  {
    id: "cohere",
    name: "Cohere",
    key: "COHERE_API_KEY",
    endpoint: "https://api.cohere.com/v2/chat",
    model: "command-r7b-12-2024",
    kind: "cohere",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    key: "PERPLEXITY_API_KEY",
    endpoint: "https://api.perplexity.ai/chat/completions",
    model: "sonar",
  },
];

function getApiProviderStatus(environment = process.env) {
  return apiProviders.map((provider) => ({
    id: provider.id,
    name: provider.name,
    status: environment[provider.key] ? "configured" : "not configured",
    detail: "API agent provider",
    model: provider.model,
    keyName: provider.key,
  }));
}

function requestValues(request = {}) {
  const prompt =
    typeof request.prompt === "string" ? request.prompt.trim() : "";
  const maxTokens = request.maxTokens === undefined ? 512 : request.maxTokens;
  const temperature =
    request.temperature === undefined ? 0.2 : request.temperature;
  if (!prompt || Buffer.byteLength(prompt, "utf8") > MAX_PROMPT_BYTES)
    throw new Error("Prompt is required and must be at most 100,000 bytes");
  if (
    !Number.isInteger(maxTokens) ||
    maxTokens < 1 ||
    maxTokens > MAX_OUTPUT_TOKENS
  )
    throw new Error(
      `maxTokens must be an integer from 1 to ${MAX_OUTPUT_TOKENS}`,
    );
  if (typeof temperature !== "number" || temperature < 0 || temperature > 2)
    throw new Error("temperature must be between 0 and 2");
  return { prompt, maxTokens, temperature };
}

function createApiGateway({
  environment = process.env,
  fetchImpl = fetch,
} = {}) {
  let currentEnvironment = environment;
  const refresh = (nextEnvironment = currentEnvironment) => {
    currentEnvironment = nextEnvironment;
    return getApiProviderStatus(currentEnvironment);
  };
  const status = () => getApiProviderStatus(currentEnvironment);

  async function generate(providerId, request = {}) {
    const provider = apiProviders.find((item) => item.id === providerId);
    if (!provider) throw new Error(`Unknown API provider: ${providerId}`);
    const key = currentEnvironment[provider.key];
    if (!key) throw new Error(`${provider.name} API key is not configured`);
    const values = requestValues(request);
    const model =
      typeof request.model === "string" && request.model.trim()
        ? request.model.trim()
        : provider.model;
    let url = provider.endpoint;
    let headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "SpartanCode",
    };
    let body;
    if (provider.kind === "anthropic") {
      headers = {
        ...headers,
        "x-api-key": key,
        "anthropic-version": API_VERSION,
      };
      body = {
        model,
        max_tokens: values.maxTokens,
        temperature: values.temperature,
        messages: [{ role: "user", content: values.prompt }],
      };
    } else if (provider.kind === "google") {
      url = `${provider.endpoint}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      body = {
        contents: [{ role: "user", parts: [{ text: values.prompt }] }],
        generationConfig: {
          temperature: values.temperature,
          maxOutputTokens: values.maxTokens,
        },
      };
    } else if (provider.kind === "cohere") {
      headers = { ...headers, Authorization: `Bearer ${key}` };
      body = {
        model,
        temperature: values.temperature,
        max_tokens: values.maxTokens,
        messages: [{ role: "user", content: values.prompt }],
      };
    } else {
      headers = { ...headers, Authorization: `Bearer ${key}` };
      body = {
        model,
        temperature: values.temperature,
        max_tokens: values.maxTokens,
        messages: [{ role: "user", content: values.prompt }],
      };
    }
    const response = await fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        `${provider.name} API request failed (${response.status})`,
      );
    const output =
      provider.kind === "anthropic"
        ? payload.content?.[0]?.text
        : provider.kind === "google"
          ? payload.candidates?.[0]?.content?.parts?.[0]?.text
          : provider.kind === "cohere"
            ? payload.message?.content?.[0]?.text
            : payload.choices?.[0]?.message?.content;
    if (typeof output !== "string")
      throw new Error(`${provider.name} API returned no text output`);
    return { provider: provider.id, model, output };
  }

  return { status, refresh, generate };
}

module.exports = { apiProviders, createApiGateway, getApiProviderStatus };
