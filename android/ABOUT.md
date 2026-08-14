# SpartanCode Android interface

The Android companion is a mobile command center, not a full code editor. Its
first surface keeps the highest-value controls reachable on a phone:

- **Command center** — local/synced status and mission-control context.
- **New mission** — queues a mission locally while offline.
- **Voice dictation** — requests explicit speech permissions and inserts a
  transcript into the mission field when the native recognizer is available.
- **Bridge connection** — accepts an MCP Bridge endpoint and reports sync or
  connection failure explicitly. Optional bridge tokens are stored in
  origin-scoped Expo SecureStore entries and never shown after sync.
- **Missions** — shows queued mission descriptions and lifecycle status.
- **Collaboration** — creates local versioned sessions offline and optionally
  publishes them through the authenticated bridge.
- **Approval gestures** — supports right-swipe approve and left-swipe deny,
  while keeping labeled buttons available for accessible interaction.
- **Runtime readiness** — reports MLC Chat, PocketPal, and llama.cpp native
  module availability and applies the licensed model/device gate before use.
  The native build includes the MIT-licensed `@pocketpalai/llama.rn` adapter;
  it becomes available only in a prebuilt native binary with a local GGUF
  model and remains unavailable in Expo Go.

## Verified behavior

The companion is documented alongside the desktop command center so the
standalone Android workflow and the optional desktop workflow are visible in
the same product record:

![SpartanCode desktop command center](../docs/assets/spartancode-workspace.png)

On 2026-08-13, the dev server exported the Expo web surface and Playwright ran
at a 390×844 viewport with device scale factor 2. The smoke test verified:

1. “Command center” renders exactly once.
2. “Queue mission” is an accessible button.
3. A mission can be entered and queued through the visible UI.
4. The queued mission appears in the missions list.
5. Screenshots in the root README match those verified states.

The committed PNG evidence is checked for signature and the documented
780×1688 (390×844 at 2x) dimensions by `scripts/verify-assets.js`; this does
not replace physical-device, emulator, or TalkBack acceptance.

The connection foundation also validates HTTPS endpoints (with localhost
allowed for development), persists a named bridge profile after a successful
sync, preserves the offline queue while applying a remote snapshot, retries
transient bridge failures, cancels in-flight retry loops, uses route-scoped
idempotency keys for remote mutations, and marks snapshots stale after five
minutes.

Native Android builds, artifact and approval workflows, licensed model
selection, storage recovery, biometric unlock, offline extension metadata,
audit rendering, device-readiness diagnostics, and a guarded signed-release
workflow are now implemented. The AWS host produced a successful API 35 native
debug build; its lack of KVM prevents reliable emulator framework startup, so
install/launch evidence remains assigned to a KVM-capable CI runner or physical
device;
physical-device accessibility and production signing still require the release
environment described in [`PLAN.md`](PLAN.md). The app remains
standalone-first: a desktop checkout or MCP Bridge is never required for local
mission planning, bundled agent roles, queueing, or review.
