import type {
  MobileRuntimeModule,
  MobileRuntimeRequest,
} from "./local-runtime";

type LlamaContext = {
  completion: (params: {
    prompt: string;
    n_predict: number;
    temperature: number;
  }) => Promise<{ text?: string }>;
  release?: () => Promise<void>;
};

type LlamaRnModule = {
  initLlama: (params: {
    model: string;
    n_ctx: number;
    n_gpu_layers: number;
  }) => Promise<LlamaContext>;
};

export function createLlamaRnRuntime(
  llama: LlamaRnModule | null | undefined,
): MobileRuntimeModule | undefined {
  if (!llama || typeof llama.initLlama !== "function") return undefined;
  return {
    async generate(request: MobileRuntimeRequest) {
      if (!request.modelPath || !request.modelPath.startsWith("/"))
        throw new Error("An absolute local GGUF model path is required");
      const context = await llama.initLlama({
        model: request.modelPath,
        n_ctx: 4096,
        n_gpu_layers: 99,
      });
      try {
        const result = await context.completion({
          prompt: request.prompt,
          n_predict: request.maxTokens ?? 256,
          temperature: request.temperature ?? 0.7,
        });
        if (typeof result.text !== "string")
          throw new Error("Native runtime returned no text");
        return result.text;
      } finally {
        await context.release?.();
      }
    },
  };
}

export function loadLlamaRnRuntime(): MobileRuntimeModule | undefined {
  try {
    // Expo Go and unit tests do not contain native modules; a prebuilt native
    // binary loads the adapter and exposes the real llama.cpp implementation.
    const llama = require("@pocketpalai/llama.rn") as LlamaRnModule;
    return createLlamaRnRuntime(llama);
  } catch {
    return undefined;
  }
}
