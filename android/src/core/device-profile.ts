import type { DeviceProfile } from "./runtime";

export type DeviceProbe = {
  chipset?: unknown;
  totalMemoryMb?: unknown;
  availableStorageMb?: unknown;
  thermalState?: unknown;
  hasVulkan?: unknown;
  hasNpu?: unknown;
};

/**
 * Read only the capability fields exposed by React Native's platform
 * constants. Native modules can provide richer probes later; missing fields
 * remain unknown instead of being guessed.
 */
export function platformDeviceProbe(
  constants: Record<string, unknown> = {},
): DeviceProbe {
  return {
    chipset:
      typeof constants.Model === "string"
        ? constants.Model
        : typeof constants.model === "string"
          ? constants.model
          : undefined,
    totalMemoryMb:
      typeof constants.TotalMemory === "number"
        ? constants.TotalMemory / (1024 * 1024)
        : undefined,
    hasVulkan:
      typeof constants.hasVulkan === "boolean"
        ? constants.hasVulkan
        : undefined,
    hasNpu:
      typeof constants.hasNpu === "boolean" ? constants.hasNpu : undefined,
  };
}

const thermalStates = new Set<DeviceProfile["thermalState"]>([
  "nominal",
  "fair",
  "serious",
  "critical",
]);

export function normalizeDeviceProfile(probe: DeviceProbe = {}): DeviceProfile {
  const numberOrUndefined = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0
      ? value
      : undefined;
  const thermalState = thermalStates.has(
    probe.thermalState as DeviceProfile["thermalState"],
  )
    ? (probe.thermalState as DeviceProfile["thermalState"])
    : undefined;
  const hasVulkan =
    typeof probe.hasVulkan === "boolean" ? probe.hasVulkan : undefined;
  const hasNpu = typeof probe.hasNpu === "boolean" ? probe.hasNpu : undefined;
  return {
    chipset: typeof probe.chipset === "string" ? probe.chipset : undefined,
    totalMemoryMb: numberOrUndefined(probe.totalMemoryMb),
    availableStorageMb: numberOrUndefined(probe.availableStorageMb),
    thermalState,
    hasVulkan,
    hasNpu,
    hasAccelerator: hasVulkan === true || hasNpu === true,
  };
}

export function deviceDiagnostics(profile: DeviceProfile) {
  const diagnostics: string[] = [];
  if (profile.totalMemoryMb !== undefined && profile.totalMemoryMb < 3072)
    diagnostics.push("At least 3 GB RAM is recommended for local model work.");
  if (
    profile.availableStorageMb !== undefined &&
    profile.availableStorageMb < 2048
  )
    diagnostics.push("Free at least 2 GB before downloading a local model.");
  if (profile.thermalState === "serious" || profile.thermalState === "critical")
    diagnostics.push(
      "Thermal state limits heavy work; queue builds until cooler.",
    );
  if (profile.hasAccelerator === false)
    diagnostics.push(
      "No Vulkan/NPU accelerator was detected; remote execution is recommended.",
    );
  if (!diagnostics.length)
    diagnostics.push("Device is eligible for the selected workload.");
  return diagnostics;
}
