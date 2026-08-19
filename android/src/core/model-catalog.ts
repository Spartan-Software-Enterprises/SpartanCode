export type ModelQuantization = "Q4_K_M" | "Q4_0" | "Q3_K_S";

export type MobileModel = {
  id: string;
  provider: string;
  license: string;
  quantizations: readonly ModelQuantization[];
  minimumMemoryMb: number;
  requiresAccelerator: boolean;
  source?: "builtin" | "huggingface";
  communityModel?: boolean;
  uncensored?: boolean;
  distilled?: boolean;
  downloadUrl?: string;
  description?: string;
};

export type HuggingFaceModelMetadata = {
  id: string;
  provider?: string;
  license: string;
  quantizations?: readonly ModelQuantization[];
  minimumMemoryMb?: number;
  requiresAccelerator?: boolean;
  uncensored?: boolean;
  distilled?: boolean;
  downloadUrl?: string;
  description?: string;
};

export const licensedMobileModels: readonly MobileModel[] = [
  {
    id: "Qwen3-1.7B",
    provider: "Qwen",
    license: "Apache-2.0",
    quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
    minimumMemoryMb: 2048,
    requiresAccelerator: false,
    description: "Fast, efficient model for general tasks and chat",
  },
  {
    id: "Qwen3-4B",
    provider: "Qwen",
    license: "Apache-2.0",
    quantizations: ["Q4_K_M", "Q4_0"],
    minimumMemoryMb: 4096,
    requiresAccelerator: false,
    description: "Balanced performance for coding and reasoning",
  },
  {
    id: "Phi-4-mini",
    provider: "Microsoft",
    license: "MIT",
    quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
    minimumMemoryMb: 4096,
    requiresAccelerator: false,
    description: "Compact Microsoft model for code and reasoning",
  },
  {
    id: "Llama-3.2-1B",
    provider: "Meta",
    license: "Llama 3.2",
    quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
    minimumMemoryMb: 2048,
    requiresAccelerator: false,
    description: "Meta's smallest Llama — fast on any device",
  },
  {
    id: "Llama-3.2-3B",
    provider: "Meta",
    license: "Llama 3.2",
    quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
    minimumMemoryMb: 3072,
    requiresAccelerator: false,
    description: "Good balance of speed and capability",
  },
  {
    id: "Gemma-3-4B",
    provider: "Google",
    license: "Gemma",
    quantizations: ["Q4_K_M", "Q4_0"],
    minimumMemoryMb: 4096,
    requiresAccelerator: false,
    description: "Google's compact model for multilingual tasks",
  },
  {
    id: "Gemma-3-1B",
    provider: "Google",
    license: "Gemma",
    quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
    minimumMemoryMb: 2048,
    requiresAccelerator: false,
    description: "Lightweight Google model for quick responses",
  },
  {
    id: "Mistral-7B-v0.3",
    provider: "Mistral AI",
    license: "Apache-2.0",
    quantizations: ["Q4_K_M", "Q4_0"],
    minimumMemoryMb: 6144,
    requiresAccelerator: false,
    description: "Strong general-purpose model from Mistral",
  },
  {
    id: "CodeLlama-7B",
    provider: "Meta",
    license: "Llama 2",
    quantizations: ["Q4_K_M", "Q4_0"],
    minimumMemoryMb: 6144,
    requiresAccelerator: false,
    description: "Code-specialized Llama for programming tasks",
  },
  {
    id: "DeepSeek-R1-Distill-Qwen-1.5B",
    provider: "DeepSeek",
    license: "MIT",
    quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
    minimumMemoryMb: 2048,
    requiresAccelerator: false,
    distilled: true,
    description: "Distilled reasoning model — chain-of-thought on mobile",
  },
  {
    id: "SmolLM2-1.7B",
    provider: "Hugging Face",
    license: "Apache-2.0",
    quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
    minimumMemoryMb: 2048,
    requiresAccelerator: false,
    description: "Tiny but capable model from HF labs",
  },
  {
    id: "Qwen2.5-Coder-1.5B",
    provider: "Qwen",
    license: "Apache-2.0",
    quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
    minimumMemoryMb: 2048,
    requiresAccelerator: false,
    description: "Code-focused model for autocomplete and editing",
  },
];

export function listCompatibleModels(
  profile: DeviceProfile = {},
  models: readonly MobileModel[] = licensedMobileModels,
) {
  return models.filter(
    (model) =>
      (profile.totalMemoryMb ?? Number.MAX_SAFE_INTEGER) >=
        model.minimumMemoryMb &&
      (!model.requiresAccelerator || profile.hasAccelerator === true),
  );
}

export function validateModelLicense(model: Pick<MobileModel, "license">) {
  return model.license === "MIT" || model.license === "Apache-2.0";
}

export function createHuggingFaceModel(
  metadata: HuggingFaceModelMetadata,
): MobileModel {
  const id = metadata.id.trim();
  const license = metadata.license.trim();
  if (!id || id.length > 160 || /\s/.test(id))
    throw new Error("Hugging Face model id is invalid");
  if (!license || license.length > 160)
    throw new Error("Hugging Face model license is required");
  const quantizations: ModelQuantization[] = Array.from(
    new Set<ModelQuantization>(
      metadata.quantizations ?? ["Q4_K_M", "Q4_0", "Q3_K_S"],
    ),
  );
  if (!quantizations.length)
    throw new Error("Hugging Face model needs a supported quantization");
  const minimumMemoryMb = metadata.minimumMemoryMb ?? 2048;
  if (!Number.isInteger(minimumMemoryMb) || minimumMemoryMb < 512)
    throw new Error("Hugging Face model memory requirement is invalid");
  return {
    id,
    provider: (metadata.provider || "Hugging Face").trim().slice(0, 80),
    license,
    quantizations,
    minimumMemoryMb,
    requiresAccelerator: metadata.requiresAccelerator === true,
    source: "huggingface",
    communityModel: true,
    uncensored: metadata.uncensored === true,
    distilled: metadata.distilled === true,
    downloadUrl: metadata.downloadUrl,
    description: metadata.description,
  };
}

import type { DeviceProfile } from "./runtime";
