import {
  licensedMobileModels,
  validateModelLicense,
  type MobileModel,
} from "./model-catalog";

export const MODEL_DOWNLOAD_TIMEOUT_MS = 120_000;

export type DownloadStore = {
  readPartial: (
    modelId: string,
    quantization: string,
  ) => Promise<Uint8Array<ArrayBufferLike>>;
  writePartial: (
    modelId: string,
    quantization: string,
    bytes: Uint8Array<ArrayBufferLike>,
  ) => Promise<void>;
  finalize: (
    modelId: string,
    quantization: string,
    bytes: Uint8Array<ArrayBufferLike>,
  ) => Promise<void>;
  clearPartial: (modelId: string, quantization: string) => Promise<void>;
  remove: (modelId: string, quantization: string) => Promise<void>;
};

export type DownloadRequest = {
  modelId: string;
  quantization: "Q4_K_M" | "Q4_0" | "Q3_K_S";
  url: string;
  expectedSha256?: string;
  availableStorageMb?: number;
  model?: MobileModel;
};

export type DownloadTransport = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}>;

function modelFor(request: DownloadRequest) {
  const model =
    request.model ||
    licensedMobileModels.find((item) => item.id === request.modelId);
  if (!model || model.id !== request.modelId)
    throw new Error("Model metadata is required for this Hugging Face model");
  if (model.source !== "huggingface" && !validateModelLicense(model))
    throw new Error(
      "Built-in model is not available under the distribution policy",
    );
  if (!model.quantizations.includes(request.quantization))
    throw new Error("Quantization is not supported for this model");
  if (
    request.availableStorageMb !== undefined &&
    request.availableStorageMb < 2048
  )
    throw new Error(
      "At least 2 GB of free storage is required for a model download",
    );
  const url = new URL(request.url);
  if (url.protocol !== "https:")
    throw new Error("Model downloads require HTTPS");
  return model;
}

function append(
  left: Uint8Array<ArrayBufferLike>,
  right: Uint8Array<ArrayBufferLike>,
) {
  const result = new Uint8Array(left.length + right.length);
  result.set(left);
  result.set(right, left.length);
  return result;
}

export async function downloadModel(
  request: DownloadRequest,
  store: DownloadStore,
  transport: DownloadTransport,
  sha256: (bytes: Uint8Array) => Promise<string>,
) {
  modelFor(request);
  const partial = await store.readPartial(
    request.modelId,
    request.quantization,
  );
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    MODEL_DOWNLOAD_TIMEOUT_MS,
  );
  try {
    const response = await transport(request.url, {
      headers: partial.length ? { Range: `bytes=${partial.length}-` } : {},
      signal: controller.signal,
    });
    if (!response.ok || (response.status !== 200 && response.status !== 206))
      throw new Error(`Model download failed (${response.status})`);
    const received = new Uint8Array(await response.arrayBuffer());
    // A server may ignore Range and return the complete object with 200. Never
    // append a partial prefix to that complete response.
    const bytes =
      partial.length && response.status === 206
        ? append(partial, received)
        : received;
    await store.writePartial(request.modelId, request.quantization, bytes);
    if (request.expectedSha256) {
      const actual = await sha256(bytes);
      if (actual.toLowerCase() !== request.expectedSha256.toLowerCase()) {
        await store.clearPartial(request.modelId, request.quantization);
        throw new Error("Model checksum verification failed");
      }
    }
    await store.finalize(request.modelId, request.quantization, bytes);
    return {
      modelId: request.modelId,
      quantization: request.quantization,
      bytes: bytes.length,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function deleteModel(
  request: Pick<DownloadRequest, "modelId" | "quantization">,
  store: DownloadStore,
) {
  return store.remove(request.modelId, request.quantization);
}
