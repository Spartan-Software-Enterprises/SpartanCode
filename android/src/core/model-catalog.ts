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
};

export type ModelQuantization = "Q4_K_M" | "Q4_0" | "Q3_K_S";

export type HuggingFaceModelMetadata = {
  id: string;
  provider?: string;
  license: string;
  quantizations?: readonly ModelQuantization[];
  minimumMemoryMb?: number;
  requiresAccelerator?: boolean;
  uncensored?: boolean;
  distilled?: boolean;
};

export const licensedMobileModels: readonly MobileModel[] = [
  {
    id: "Qwen3-1.7B",
    provider: "Qwen",
    license: "Apache-2.0",
    quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
    minimumMemoryMb: 3072,
    requiresAccelerator: false,
  },
  {
    id: "Phi-4-mini",
    provider: "Microsoft",
    license: "MIT",
    quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
    minimumMemoryMb: 4096,
    requiresAccelerator: false,
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

/**
 * Normalize explicitly selected Hugging Face metadata without applying the
 * built-in distribution-license filter. Users remain responsible for the
 * model's terms; runtime/download code still requires HTTPS and bounded data.
 */
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
  };
}
import type { DeviceProfile } from "./runtime";
