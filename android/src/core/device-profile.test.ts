import {
  deviceDiagnostics,
  normalizeDeviceProfile,
  platformDeviceProbe,
  verifyDeviceReadiness,
} from "./device-profile";

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

  it("maps platform constants without guessing missing capabilities", () => {
    expect(
      normalizeDeviceProfile(
        platformDeviceProbe({
          Model: "Test Tablet",
          TotalMemory: 4 * 1024 ** 3,
        }),
      ),
    ).toMatchObject({ chipset: "Test Tablet", totalMemoryMb: 4096 });
    expect(platformDeviceProbe({})).toEqual({
      chipset: undefined,
      totalMemoryMb: undefined,
      hasVulkan: undefined,
      hasNpu: undefined,
    });
    expect(normalizeDeviceProfile()).toMatchObject({
      hasAccelerator: undefined,
    });
  });

  it("reports pass, fail, and unknown readiness states for a physical device", () => {
    expect(
      verifyDeviceReadiness(
        normalizeDeviceProfile({
          totalMemoryMb: 4096,
          availableStorageMb: 8192,
          thermalState: "nominal",
          hasVulkan: true,
        }),
      ),
    ).toEqual([
      {
        id: "memory",
        label: "Memory",
        status: "pass",
        detail: "4096 MB RAM reported",
      },
      {
        id: "storage",
        label: "Storage",
        status: "pass",
        detail: "8192 MB free",
      },
      {
        id: "thermal",
        label: "Thermal state",
        status: "pass",
        detail: "nominal",
      },
      {
        id: "accelerator",
        label: "Local accelerator",
        status: "pass",
        detail: "Vulkan or NPU available",
      },
    ]);

    expect(
      verifyDeviceReadiness(
        normalizeDeviceProfile({
          totalMemoryMb: 1024,
          availableStorageMb: 512,
          thermalState: "critical",
          hasVulkan: false,
          hasNpu: false,
        }),
      ).map(({ id, status }) => ({ id, status })),
    ).toEqual([
      { id: "memory", status: "fail" },
      { id: "storage", status: "fail" },
      { id: "thermal", status: "fail" },
      { id: "accelerator", status: "warn" },
    ]);

    expect(
      verifyDeviceReadiness({}).every((check) => check.status === "warn"),
    ).toBe(true);
  });
});
