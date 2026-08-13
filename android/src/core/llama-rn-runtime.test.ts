import { createLlamaRnRuntime } from "./llama-rn-runtime";

describe("llama.rn native adapter", () => {
  it("invokes a local model and releases the native context", async () => {
    const release = jest.fn(async () => undefined);
    const completion = jest.fn(async () => ({ text: "local answer" }));
    const initLlama = jest.fn(async () => ({ completion, release }));
    const runtime = createLlamaRnRuntime({ initLlama });
    await expect(
      runtime?.generate({
        prompt: "hello",
        modelId: "Qwen3-1.7B",
        quantization: "Q4_K_M",
        modelPath: "/data/local/model.gguf",
        maxTokens: 128,
        temperature: 0.2,
      }),
    ).resolves.toBe("local answer");
    expect(initLlama).toHaveBeenCalledWith({
      model: "/data/local/model.gguf",
      n_ctx: 4096,
      n_gpu_layers: 99,
    });
    expect(completion).toHaveBeenCalledWith({
      prompt: "hello",
      n_predict: 128,
      temperature: 0.2,
    });
    expect(release).toHaveBeenCalled();
  });

  it("fails before native invocation when the model path is unsafe", async () => {
    const initLlama = jest.fn();
    const runtime = createLlamaRnRuntime({ initLlama });
    await expect(
      runtime?.generate({
        prompt: "hello",
        modelId: "Qwen3-1.7B",
        quantization: "Q4_K_M",
        modelPath: "file:///model.gguf",
      }),
    ).rejects.toThrow("absolute local GGUF");
    expect(initLlama).not.toHaveBeenCalled();
  });
});
