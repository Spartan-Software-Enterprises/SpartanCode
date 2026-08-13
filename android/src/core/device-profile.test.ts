import { deviceDiagnostics, normalizeDeviceProfile } from "./device-profile";

describe("device capability normalization", () => {
  it("normalizes valid probes and derives accelerator availability", () => {
    expect(
      normalizeDeviceProfile({
        chipset: "TestChip",
        totalMemoryMb: 4096,
        availableStorageMb: 8192,
        hasVulkan: true,
        thermalState: "nominal",
      }),
    ).toMatchObject({ chipset: "TestChip", hasAccelerator: true });
  });

  it("turns constrained probes into actionable diagnostics", () => {
    const profile = normalizeDeviceProfile({
      totalMemoryMb: 1024,
      availableStorageMb: 512,
      thermalState: "critical",
      hasVulkan: false,
      hasNpu: false,
    });
    expect(deviceDiagnostics(profile)).toEqual([
      "At least 3 GB RAM is recommended for local model work.",
      "Free at least 2 GB before downloading a local model.",
      "Thermal state limits heavy work; queue builds until cooler.",
      "No Vulkan/NPU accelerator was detected; remote execution is recommended.",
    ]);
  });
});
