# SpartanCode Android interface

The Android companion is a mobile command center, not a full code editor. Its
first surface keeps the highest-value controls reachable on a phone:

- **Command center** — local/synced status and mission-control context.
- **New mission** — queues a mission locally while offline.
- **Bridge connection** — accepts an MCP Bridge endpoint and reports sync or
  connection failure explicitly. Optional bridge tokens are stored in
  origin-scoped Expo SecureStore entries and never shown after sync.
- **Missions** — shows queued mission descriptions and lifecycle status.

## Verified behavior

On 2026-08-13, the dev server exported the Expo web surface and Playwright ran
at a 390×844 viewport with device scale factor 2. The smoke test verified:

1. “Command center” renders exactly once.
2. “Queue mission” is an accessible button.
3. A mission can be entered and queued through the visible UI.
4. The queued mission appears in the missions list.
5. Screenshots in the root README match those verified states.

The connection foundation also validates HTTPS endpoints (with localhost
allowed for development), persists a named bridge profile after a successful
sync, preserves the offline queue while applying a remote snapshot, retries
transient bridge failures, and marks snapshots stale after five minutes.

This is an evidence record for the current scaffold, not a claim that the full
Android roadmap is complete. Native Android builds, full artifact and approval
workflows, model runtimes, accessibility matrix, and signed release artifacts
remain roadmap work tracked in [`PLAN.md`](PLAN.md). The app is intentionally
standalone-first: a desktop checkout or MCP Bridge is never required for local
mission planning, bundled agent roles, queueing, or review.
