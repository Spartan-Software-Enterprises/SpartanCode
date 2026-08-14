import { searchHuggingFaceModels } from "./huggingface-catalog";

describe("Hugging Face catalog discovery", () => {
  it("normalizes community, uncensored, and distilled metadata without license filtering", async () => {
    const results = await searchHuggingFaceModels("uncensored", {
      fetch: async () => ({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "community/model",
            cardData: { license: "other" },
            tags: ["text-generation", "uncensored", "distilled"],
            downloads: 123,
            likes: 7,
          },
        ],
      }),
    });

    expect(results[0]).toMatchObject({
      id: "community/model",
      downloads: 123,
      likes: 7,
      model: {
        source: "huggingface",
        license: "other",
        uncensored: true,
        distilled: true,
      },
    });
  });

  it("bounds the request and fails closed on an invalid response", async () => {
    await expect(searchHuggingFaceModels(" ")).rejects.toThrow(
      "empty or too long",
    );
    await expect(
      searchHuggingFaceModels("models", {
        limit: 500,
        fetch: async (url) => {
          expect(url).toContain("limit=50");
          return { ok: true, status: 200, json: async () => ({}) };
        },
      }),
    ).rejects.toThrow("invalid results");
  });

  it("reports HTTP failures without returning partial records", async () => {
    await expect(
      searchHuggingFaceModels("models", {
        fetch: async () => ({ ok: false, status: 429, json: async () => [] }),
      }),
    ).rejects.toThrow("(429)");
  });
});
