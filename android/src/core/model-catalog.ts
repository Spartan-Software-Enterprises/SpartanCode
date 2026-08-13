export type MobileModel = {
  id: string;
  provider: string;
  license: "Apache-2.0" | "MIT";
  quantizations: readonly ["Q4_K_M", "Q4_0", "Q3_K_S"];
  minimumMemoryMb: number;
  requiresAccelerator: boolean;
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

export function listCompatibleModels(profile: DeviceProfile = {}) {
  return licensedMobileModels.filter(
    (model) =>
      (profile.totalMemoryMb ?? Number.MAX_SAFE_INTEGER) >=
        model.minimumMemoryMb &&
      (!model.requiresAccelerator || profile.hasAccelerator === true),
  );
}

export function validateModelLicense(model: Pick<MobileModel, "license">) {
  return model.license === "MIT" || model.license === "Apache-2.0";
}
import type { DeviceProfile } from "./runtime";
