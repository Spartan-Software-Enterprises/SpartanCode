import {
  downloadModel,
  MAX_MODEL_BYTES,
  MODEL_DOWNLOAD_TIMEOUT_MS,
  type DownloadStore,
} from "./model-download";

function memoryStore() {
  let partial: Uint8Array<ArrayBufferLike> = new Uint8Array();
  let finalized: Uint8Array<ArrayBufferLike> = new Uint8Array();
  let clearedPartial = false;
  return {
    store: {
      readPartial: async () => partial,
      writePartial: async (_model, _quantization, bytes) => {
        partial = bytes;
      },
      finalize: async (_model, _quantization, bytes) => {
        finalized = bytes;
      },
      clearPartial: async () => {
        clearedPartial = true;
        partial = new Uint8Array();
      },
      remove: async () => {
        partial = new Uint8Array();
        finalized = new Uint8Array();
      },
    } satisfies DownloadStore,
    get finalized() {
      return finalized;
    },
    get clearedPartial() {
      return clearedPartial;
    },
  };
}

describe("licensed resumable model downloads", () => {
  it("resumes with a byte range and finalizes after checksum verification", async () => {
    const memory = memoryStore();
    await memory.store.writePartial(
      "Qwen3-1.7B",
      "Q4_K_M",
      new Uint8Array([1, 2]),
    );
    let headers: Record<string, string> = {};
    const result = await downloadModel(
      {
        modelId: "Qwen3-1.7B",
        quantization: "Q4_K_M",
        url: "https://models.example/qwen.gguf",
        expectedSha256: "01020304",
      },
      memory.store,
      async (_url, init) => {
        headers = init.headers;
        return {
          ok: true,
          status: 206,
          arrayBuffer: async () => new Uint8Array([3, 4]).buffer,
        };
      },
      async () => "01020304",
    );
    expect(headers.Range).toBe("bytes=2-");
    expect(result.bytes).toBe(4);
    expect([...memory.finalized]).toEqual([1, 2, 3, 4]);
  });

  it("passes a bounded abort signal to the model transport", async () => {
    const memory = memoryStore();
    let signal: AbortSignal | undefined;
    await downloadModel(
      {
        modelId: "Qwen3-1.7B",
        quantization: "Q4_K_M",
        url: "https://models.example/qwen.gguf",
      },
      memory.store,
      async (_url, init) => {
        signal = init.signal;
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => new Uint8Array([1]).buffer,
        };
      },
      async () => "",
    );
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);
    expect(MODEL_DOWNLOAD_TIMEOUT_MS).toBe(120_000);
  });

  it("rejects oversized declared responses before persistence", async () => {
    const memory = memoryStore();
    let read = false;
    await expect(
      downloadModel(
        {
          modelId: "Qwen3-1.7B",
          quantization: "Q4_K_M",
          url: "https://models.example/qwen.gguf",
        },
        memory.store,
        async () => ({
          ok: true,
          status: 200,
          headers: { get: () => String(MAX_MODEL_BYTES + 1) },
          arrayBuffer: async () => {
            read = true;
            return new ArrayBuffer(0);
          },
        }),
        async () => "",
      ),
    ).rejects.toThrow("size limit");
    expect(read).toBe(false);
    expect(memory.finalized).toHaveLength(0);
  });

  it("rejects non-HTTPS or unlicensed requests before transport", async () => {
    const memory = memoryStore();
    const transport = jest.fn();
    await expect(
      downloadModel(
        {
          modelId: "Qwen3-1.7B",
          quantization: "Q4_K_M",
          url: "http://models.example/qwen.gguf",
        },
        memory.store,
        transport,
        async () => "",
      ),
    ).rejects.toThrow("HTTPS");
    expect(transport).not.toHaveBeenCalled();
  });

  it("does not finalize a checksum mismatch", async () => {
    const memory = memoryStore();
    await expect(
      downloadModel(
        {
          modelId: "Phi-4-mini",
          quantization: "Q4_0",
          url: "https://models.example/phi.gguf",
          expectedSha256: "good",
        },
        memory.store,
        async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => new Uint8Array([1]).buffer,
        }),
        async () => "bad",
      ),
    ).rejects.toThrow("checksum");
    expect(memory.finalized).toHaveLength(0);
    expect(memory.clearedPartial).toBe(true);
  });

  it("supports an explicitly selected Hugging Face community model", async () => {
    const memory = memoryStore();
    const result = await downloadModel(
      {
        modelId: "org/uncensored-distill",
        quantization: "Q4_0",
        url: "https://huggingface.co/org/uncensored-distill/resolve/main/model.gguf",
        model: {
          id: "org/uncensored-distill",
          provider: "Community",
          license: "Unknown",
          quantizations: ["Q4_K_M", "Q4_0", "Q3_K_S"],
          minimumMemoryMb: 2048,
          requiresAccelerator: false,
          source: "huggingface",
          communityModel: true,
          uncensored: true,
          distilled: true,
        },
      },
      memory.store,
      async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([1, 2]).buffer,
      }),
      async () => "",
    );
    expect(result.modelId).toBe("org/uncensored-distill");
  });

  it("does not duplicate a partial when a server ignores the Range header", async () => {
    const memory = memoryStore();
    await memory.store.writePartial(
      "Qwen3-1.7B",
      "Q4_K_M",
      new Uint8Array([1, 2]),
    );
    const result = await downloadModel(
      {
        modelId: "Qwen3-1.7B",
        quantization: "Q4_K_M",
        url: "https://models.example/qwen.gguf",
      },
      memory.store,
      async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([9, 10]).buffer,
      }),
      async () => "",
    );
    expect(result.bytes).toBe(2);
    expect([...memory.finalized]).toEqual([9, 10]);
  });

  it("blocks low-storage downloads before opening the transport", async () => {
    const memory = memoryStore();
    const transport = jest.fn();
    await expect(
      downloadModel(
        {
          modelId: "Qwen3-1.7B",
          quantization: "Q4_K_M",
          url: "https://models.example/qwen.gguf",
          availableStorageMb: 1024,
        },
        memory.store,
        transport,
        async () => "",
      ),
    ).rejects.toThrow("2 GB");
    expect(transport).not.toHaveBeenCalled();
  });
});
