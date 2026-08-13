export type GestureDecision = "approved" | "denied";

/** Map a deliberate horizontal swipe to an approval decision. */
export function approvalGestureDecision(
  dx: number,
  dy: number,
  threshold = 80,
): GestureDecision | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || threshold <= 0)
    return null;
  if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return null;
  return dx > 0 ? "approved" : "denied";
}
