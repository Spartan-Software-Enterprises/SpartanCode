export const feedbackKinds = ["bug", "feature", "feedback"] as const;
export const MAX_FEEDBACK_RECORDS = 25;
const MAX_FEEDBACK_DETAILS = 2_000;

export type MobileFeedback = {
  id: string;
  kind: (typeof feedbackKinds)[number];
  summary: string;
  details: string;
  client: "android";
  sanitized: true;
  createdAt: string;
};

const secretPattern =
  /(api[_-]?key|access[_-]?token|password|private[_ -]?key)\s*[:=]|-----BEGIN [A-Z ]+PRIVATE KEY-----/i;

export function createMobileFeedback(
  kind: MobileFeedback["kind"],
  summary: string,
  details: string,
  now = new Date().toISOString(),
  id = `feedback:${Date.now()}`,
): MobileFeedback {
  const normalizedSummary = summary.trim().slice(0, 200);
  const normalizedDetails = details.trim().slice(0, MAX_FEEDBACK_DETAILS);
  if (!feedbackKinds.includes(kind))
    throw new Error("Feedback type is invalid");
  if (!normalizedSummary) throw new Error("Feedback summary is required");
  if (secretPattern.test(`${normalizedSummary}\n${normalizedDetails}`))
    throw new Error("Remove credentials before saving feedback");
  return {
    id: id.slice(0, 160),
    kind,
    summary: normalizedSummary,
    details: normalizedDetails,
    client: "android",
    sanitized: true,
    createdAt: now,
  };
}

export function isMobileFeedback(value: unknown): value is MobileFeedback {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MobileFeedback>;
  return (
    typeof item.id === "string" &&
    typeof item.summary === "string" &&
    typeof item.details === "string" &&
    item.client === "android" &&
    item.sanitized === true &&
    typeof item.createdAt === "string" &&
    feedbackKinds.includes(item.kind as MobileFeedback["kind"])
  );
}
