export type DeviceProfile = {
  totalMemoryMb?: number;
  availableStorageMb?: number;
  thermalState?: "nominal" | "fair" | "serious" | "critical";
  hasAccelerator?: boolean;
};

export type WorkloadKind =
  | "planning"
  | "chat"
  | "build"
  | "verification"
  | "model-download";

export type WorkloadRoute = "dev-server" | "on-device" | "queue";

export function chooseWorkloadRoute(
  kind: WorkloadKind,
  serverConnected: boolean,
  profile: DeviceProfile = {},
): WorkloadRoute {
  if (serverConnected) return "dev-server";
  if (kind === "build" || kind === "verification") {
    if (profile.thermalState === "critical" || profile.thermalState === "serious")
      return "queue";
    if ((profile.totalMemoryMb ?? 0) < 3072) return "queue";
  }
  if (kind === "model-download") {
    if ((profile.availableStorageMb ?? 0) < 2048) return "queue";
    return profile.hasAccelerator ? "on-device" : "queue";
  }
  return "on-device";
}

export function workloadLabel(route: WorkloadRoute): string {
  if (route === "dev-server") return "Running on Dev server";
  if (route === "queue") return "Queued until a capable runtime is available";
  return "Running on this device";
}
