import type { DeviceProfile } from "./runtime";

export type DeviceProbe = {
  chipset?: unknown;
  totalMemoryMb?: unknown;
  availableStorageMb?: unknown;
  thermalState?: unknown;
  hasVulkan?: unknown;
  hasNpu?: unknown;
};

export type DeviceVerificationStatus = "pass" | "warn" | "fail";

export type DeviceVerificationCheck = {
  id: "memory" | "storage" | "thermal" | "accelerator";
  label: string;
  status: DeviceVerificationStatus;
  detail: string;
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
  const hasAccelerator =
    hasVulkan === true || hasNpu === true
      ? true
      : hasVulkan !== undefined || hasNpu !== undefined
        ? false
        : undefined;
  return {
    chipset: typeof probe.chipset === "string" ? probe.chipset : undefined,
    totalMemoryMb: numberOrUndefined(probe.totalMemoryMb),
    availableStorageMb: numberOrUndefined(probe.availableStorageMb),
    thermalState,
    hasVulkan,
    hasNpu,
    hasAccelerator,
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

/**
 * Produce a stable, machine-readable readiness report for on-device work.
 * Unknown native probes are warnings rather than failures so older Android
 * builds remain usable while still making missing verification explicit.
 */
export function verifyDeviceReadiness(
  profile: DeviceProfile,
): DeviceVerificationCheck[] {
  const memoryStatus: DeviceVerificationStatus =
    profile.totalMemoryMb === undefined
      ? "warn"
      : profile.totalMemoryMb >= 3072
        ? "pass"
        : "fail";
  const storageStatus: DeviceVerificationStatus =
    profile.availableStorageMb === undefined
      ? "warn"
      : profile.availableStorageMb >= 2048
        ? "pass"
        : "fail";
  const thermalStatus: DeviceVerificationStatus =
    profile.thermalState === undefined
      ? "warn"
      : profile.thermalState === "serious" ||
          profile.thermalState === "critical"
        ? "fail"
        : "pass";
  const acceleratorStatus: DeviceVerificationStatus =
    profile.hasAccelerator === undefined
      ? "warn"
      : profile.hasAccelerator
        ? "pass"
        : "warn";

  return [
    {
      id: "memory",
      label: "Memory",
      status: memoryStatus,
      detail:
        profile.totalMemoryMb === undefined
          ? "RAM probe unavailable"
          : `${Math.round(profile.totalMemoryMb)} MB RAM reported`,
    },
    {
      id: "storage",
      label: "Storage",
      status: storageStatus,
      detail:
        profile.availableStorageMb === undefined
          ? "Free-storage probe unavailable"
          : `${Math.round(profile.availableStorageMb)} MB free`,
    },
    {
      id: "thermal",
      label: "Thermal state",
      status: thermalStatus,
      detail: profile.thermalState ?? "Thermal probe unavailable",
    },
    {
      id: "accelerator",
      label: "Local accelerator",
      status: acceleratorStatus,
      detail:
        profile.hasAccelerator === undefined
          ? "Vulkan/NPU probe unavailable"
          : profile.hasAccelerator
            ? "Vulkan or NPU available"
            : "No Vulkan/NPU detected; remote execution recommended",
    },
  ];
}
