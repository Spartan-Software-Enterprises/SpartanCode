import { licensedMobileModels, validateModelLicense } from "./model-catalog";

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
  remove: (modelId: string, quantization: string) => Promise<void>;
};

export type DownloadRequest = {
  modelId: string;
  quantization: "Q4_K_M" | "Q4_0" | "Q3_K_S";
  url: string;
  expectedSha256?: string;
};

export type DownloadTransport = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}>;

function modelFor(request: DownloadRequest) {
  const model = licensedMobileModels.find(
    (item) => item.id === request.modelId,
  );
  if (!model || !validateModelLicense(model))
    throw new Error("Model is not available under the mobile license policy");
  if (!model.quantizations.includes(request.quantization))
    throw new Error("Quantization is not supported for this model");
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
  const response = await transport(request.url, {
    headers: partial.length ? { Range: `bytes=${partial.length}-` } : {},
  });
  if (!response.ok || (response.status !== 200 && response.status !== 206))
    throw new Error(`Model download failed (${response.status})`);
  const received = new Uint8Array(await response.arrayBuffer());
  const bytes = append(partial, received);
  await store.writePartial(request.modelId, request.quantization, bytes);
  if (request.expectedSha256) {
    const actual = await sha256(bytes);
    if (actual.toLowerCase() !== request.expectedSha256.toLowerCase())
      throw new Error("Model checksum verification failed");
  }
  await store.finalize(request.modelId, request.quantization, bytes);
  return {
    modelId: request.modelId,
    quantization: request.quantization,
    bytes: bytes.length,
  };
}

export function deleteModel(
  request: Pick<DownloadRequest, "modelId" | "quantization">,
  store: DownloadStore,
) {
  return store.remove(request.modelId, request.quantization);
}
