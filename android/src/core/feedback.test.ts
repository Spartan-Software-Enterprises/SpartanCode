import { createMobileFeedback, isMobileFeedback } from "./feedback";

describe("standalone beta feedback", () => {
  it("creates sanitized Android feedback records", () => {
    const record = createMobileFeedback(
      "bug",
      "The project checklist is unclear",
      "The package step needs a clearer explanation.",
      "2026-08-14T00:00:00.000Z",
      "feedback-1",
    );
    expect(record).toEqual({
      id: "feedback-1",
      kind: "bug",
      summary: "The project checklist is unclear",
      details: "The package step needs a clearer explanation.",
      client: "android",
      sanitized: true,
      createdAt: "2026-08-14T00:00:00.000Z",
    });
    expect(isMobileFeedback(record)).toBe(true);
  });

  it("rejects likely credentials before persistence", () => {
    expect(() =>
      createMobileFeedback("feedback", "Connection failed", "api_key=secret"),
    ).toThrow("Remove credentials");
    expect(() => createMobileFeedback("feature", "", "details")).toThrow(
      "summary is required",
    );
  });

  it("bounds long feedback details", () => {
    const record = createMobileFeedback(
      "feedback",
      "Summary",
      "x".repeat(5000),
    );
    expect(record.details).toHaveLength(2000);
  });
});
