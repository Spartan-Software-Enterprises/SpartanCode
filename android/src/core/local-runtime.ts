import { listCompatibleModels, licensedMobileModels } from "./model-catalog";
import type { DeviceProfile } from "./runtime";

export type MobileRuntimeId = "mlc-chat" | "pocketpal" | "llama.cpp";

export type MobileRuntimeModule = {
  generate: (request: MobileRuntimeRequest) => Promise<string> | string;
};

export type MobileRuntimeRequest = {
  prompt: string;
  modelId: string;
  quantization: "Q4_K_M" | "Q4_0" | "Q3_K_S";
  modelPath?: string;
  maxTokens?: number;
  temperature?: number;
};

export type MobileRuntimeStatus = {
  id: MobileRuntimeId;
  status: "available" | "unavailable";
  reason?: string;
};

const runtimeIds: readonly MobileRuntimeId[] = [
  "mlc-chat",
  "pocketpal",
  "llama.cpp",
];

function isRuntimeModule(value: unknown): value is MobileRuntimeModule {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as MobileRuntimeModule).generate === "function"
  );
}

export function createMobileRuntimeRegistry(
  modules: Partial<Record<MobileRuntimeId, unknown>> = {},
  profile: DeviceProfile = {},
  availableModels = licensedMobileModels,
) {
  const compatibleModels = listCompatibleModels(profile, availableModels);
  const statuses: MobileRuntimeStatus[] = runtimeIds.map((id) => ({
    id,
    status: isRuntimeModule(modules[id]) ? "available" : "unavailable",
    reason: isRuntimeModule(modules[id])
      ? undefined
      : "Native runtime module is not installed",
  }));
  return {
    list(): MobileRuntimeStatus[] {
      return statuses.map((status) => ({ ...status }));
    },
    async generate(
      request: MobileRuntimeRequest & {
        runtime: MobileRuntimeId;
      },
    ) {
      const status = statuses.find((item) => item.id === request.runtime);
      if (!status)
        throw new Error(`Unknown mobile runtime: ${request.runtime}`);
      if (status.status !== "available")
        return {
          ok: false as const,
          runtime: request.runtime,
          code: "runtime-unavailable" as const,
          message: status.reason!,
        };
      if (!request.prompt.trim())
        return {
          ok: false as const,
          runtime: request.runtime,
          code: "invalid-request" as const,
          message: "Prompt is required",
        };
      const model = compatibleModels.find(
        (item) => item.id === request.modelId,
      );
      if (!model || !model.quantizations.includes(request.quantization))
        return {
          ok: false as const,
          runtime: request.runtime,
          code: "model-incompatible" as const,
          message: "Model is not compatible with this device or quantization",
        };
      try {
        const output = await (
          modules[request.runtime] as MobileRuntimeModule
        ).generate({
          prompt: request.prompt,
          modelId: request.modelId,
          quantization: request.quantization,
          modelPath: request.modelPath,
          maxTokens: request.maxTokens,
          temperature: request.temperature,
        });
        return { ok: true as const, runtime: request.runtime, output };
      } catch (error) {
        return {
          ok: false as const,
          runtime: request.runtime,
          code: "runtime-failed" as const,
          message: String(error instanceof Error ? error.message : error).slice(
            0,
            500,
          ),
        };
      }
    },
  };
}
