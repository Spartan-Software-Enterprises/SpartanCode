import { createHuggingFaceModel, type MobileModel } from "./model-catalog";

const API_ORIGIN = "https://huggingface.co";
const MAX_QUERY_LENGTH = 120;
const MAX_RESULTS = 50;
const REQUEST_TIMEOUT_MS = 10_000;

export type HuggingFaceSearchResult = {
  id: string;
  model: MobileModel;
  downloads: number;
  likes: number;
  tags: readonly string[];
};

type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

function boundedText(value: unknown, fallback: string, limit: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, limit)
    : fallback;
}

function numeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function tagsOf(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.filter((item): item is string => typeof item === "string")),
  ).slice(0, 40);
}

function licenseOf(item: Record<string, unknown>) {
  const cardData = item.cardData;
  if (cardData && typeof cardData === "object") {
    const license = (cardData as Record<string, unknown>).license;
    if (typeof license === "string" && license.trim()) return license;
  }
  return boundedText(item.license, "Unknown", 160);
}

function normalize(item: unknown): HuggingFaceSearchResult {
  if (!item || typeof item !== "object")
    throw new Error("Hugging Face returned an invalid model record");
  const record = item as Record<string, unknown>;
  const id = boundedText(record.id, "", 160);
  if (!id || !/^[^/\s]+\/[^/\s]+$/.test(id))
    throw new Error("Hugging Face returned an invalid model id");
  const tags = tagsOf(record.tags);
  const model = createHuggingFaceModel({
    id,
    provider: id.split("/", 1)[0],
    license: licenseOf(record),
    uncensored: tags.some((tag) =>
      /uncensored|abliterated|no[-_ ]filter/i.test(tag),
    ),
    distilled: tags.some((tag) => /distill(ed)?|student/i.test(tag)),
  });
  return {
    id,
    model,
    downloads: numeric(record.downloads),
    likes: numeric(record.likes),
    tags,
  };
}

export async function searchHuggingFaceModels(
  query: string,
  options: { limit?: number; fetch?: FetchLike } = {},
): Promise<readonly HuggingFaceSearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery || normalizedQuery.length > MAX_QUERY_LENGTH)
    throw new Error("Hugging Face search text is empty or too long");
  const limit = Math.min(
    Math.max(Math.floor(options.limit ?? 20), 1),
    MAX_RESULTS,
  );
  const url = new URL("/api/models", API_ORIGIN);
  url.searchParams.set("search", normalizedQuery);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("full", "true");
  const fetcher = options.fetch ?? (globalThis.fetch as unknown as FetchLike);
  if (typeof fetcher !== "function") throw new Error("Fetch is unavailable");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(url.toString(), {
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(`Hugging Face request failed (${response.status})`);
    const payload = await response.json();
    if (!Array.isArray(payload))
      throw new Error("Hugging Face returned invalid results");
    return payload.slice(0, limit).map(normalize);
  } finally {
    clearTimeout(timer);
  }
}
