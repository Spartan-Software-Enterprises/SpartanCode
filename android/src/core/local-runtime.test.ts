import type { MobileRuntimeRequest } from "./local-runtime";
import { createMobileRuntimeRegistry } from "./local-runtime";

describe("Android native runtime boundary", () => {
  it("reports missing native runtimes explicitly", () => {
    const registry = createMobileRuntimeRegistry({}, { totalMemoryMb: 4096 });
    expect(registry.list()).toEqual([
      {
        id: "mlc-chat",
        status: "unavailable",
        reason: "Native runtime module is not installed",
      },
      {
        id: "pocketpal",
        status: "unavailable",
        reason: "Native runtime module is not installed",
      },
      {
        id: "llama.cpp",
        status: "unavailable",
        reason: "Native runtime module is not installed",
      },
    ]);
  });

  it("invokes an installed runtime only with a compatible licensed model", async () => {
    const calls: unknown[] = [];
    const registry = createMobileRuntimeRegistry(
      {
        "mlc-chat": {
          generate: async (request: MobileRuntimeRequest) => {
            calls.push(request);
            return "on-device answer";
          },
        },
      },
      { totalMemoryMb: 3072 },
    );
    await expect(
      registry.generate({
        runtime: "mlc-chat",
        prompt: "hello",
        modelId: "Qwen3-1.7B",
        quantization: "Q4_K_M",
      }),
    ).resolves.toEqual({
      ok: true,
      runtime: "mlc-chat",
      output: "on-device answer",
    });
    expect(calls).toHaveLength(1);
    await expect(
      registry.generate({
        runtime: "mlc-chat",
        prompt: "hello",
        modelId: "Phi-4-mini",
        quantization: "Q4_K_M",
      }),
    ).resolves.toMatchObject({ code: "model-incompatible" });
  });
});
