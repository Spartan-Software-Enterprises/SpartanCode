# SpartanCode Android roadmap

This is the implementation contract for the Android version. The full product
roadmap remains [`../vibe-coding-export.txt`](../vibe-coding-export.txt); this
file turns its Android priorities into verifiable delivery gates.

## Product goal

Android is a mobile-first, offline-capable command center for missions,
approvals, artifacts, and remote workspaces. It must expose honest sync state,
keep credentials in secure storage, and never bypass approval policy.
The desktop application and MCP Bridge are optional enhancements, never
requirements. Android-only users must retain bundled agent roles, local
planning, durable queues, artifact review, and policy-visible state offline.

## Phase 1 — Foundation and parity

- Ship Expo/React Native navigation and a responsive phone/tablet shell.
- Share mission, artifact, approval, audit, and policy wire schemas with the
  desktop implementation.
- Add versioned snapshot migrations and corruption recovery.
- Keep the offline mission queue durable and idempotent.

Gate: a cold start renders the last valid snapshot offline; malformed newer
fields do not delete queued missions; TalkBack labels exist on core actions.

## Phase 2 — Mobile and remote (roadmap weeks 9–16)

- Add QR pairing for MCP Bridge URL/token exchange.
- Store bridge tokens only in Expo SecureStore; never store passwords or keys.
- Add reconnect backoff, cancellation, stale-data timestamps, and token expiry.
- Add mission Plan/Build/Verify timeline, approval decisions, artifact review,
  audit events, retry, and cancellation.
- Add SSH profile handoff, artifact sync, cost estimates, and router guidance.

Gate: every remote mutation has pending/approved/denied evidence; offline
mutations queue until acknowledged; logout removes all secrets.

Current foundation evidence: manual endpoint/token entry now validates secure
transport, stores tokens by bridge origin, records a bridge connection profile,
retains planning missions when a sync response arrives, retries transient
bridge failures, expires stored tokens, labels stale snapshots, accepts QR
pairing payloads, and supports deletion of all stored bridge secrets.

When a bridge endpoint is configured, foreground resume and a bounded
one-minute interval retry synchronization. Approval and artifact mutations use
stable idempotency keys in both immediate and queued paths.

Snapshot recovery now quarantines malformed serialized data before clearing it,
so a cold start can recover without silently reusing corrupt state. The Android
test suite covers this recovery path alongside the durable idempotent queue.
Standalone remote guidance also includes provider-neutral cost estimates and
explicit private/public router traversal recommendations; it performs no
provisioning or port changes.

Snapshot reads apply the current schema version while retaining valid legacy
missions and ignoring malformed optional records. Bridge requests support
cancellation during retry backoff, and the licensed mobile catalog filters
Qwen3-1.7B and Phi-4-mini by explicit permissive license and memory capacity.
The MCP Bridge now deduplicates retried POST mutations by bounded,
route-scoped idempotency keys, matching the Android durable queue contract.
The download core resumes partial HTTPS transfers, verifies an optional SHA-256
checksum before finalization, and supports deletion through an injected store.
Device probes are normalized into safe memory, storage, thermal, chipset, and
Vulkan/NPU fields with actionable diagnostics when native capability data is
missing or constrained. The command center now renders the available platform
probe and diagnostics directly, while unknown values remain explicitly
unknown until a richer native probe is available.
Voice dictation now uses the Expo speech-recognition native module with
explicit microphone/speech permission handling, transcript insertion into the
mission field, and a visible unavailable/error state.
The Expo configuration permits both orientations and a resizable Android
activity for tablet and landscape layouts.
The mobile runtime registry now defines typed MLC Chat, PocketPal, and llama.cpp
native-module boundaries. It enforces the compatible licensed catalog before
invocation and reports missing native modules as unavailable. The MIT-licensed
`@pocketpalai/llama.rn` adapter is integrated through Expo prebuild; installing
it in a native binary and exercising it on-device remain release-environment
gates.
System reduced-motion, large-text, and screen-reader preferences are detected
without overriding them; the shell uses native accessibility labels and
reports the active preferences in Device readiness.
Android also ships offline-safe starter templates, personas, and plugin
metadata so the extensibility surface does not require a desktop install.
The command center renders the synced audit activity feed alongside mission,
approval, and artifact state.

Android now includes an offline-first collaboration surface. Users can create
and persist local sessions without a desktop or bridge; when connected, valid
remote sessions are merged by revision and new sessions can be published over
the authenticated collaboration routes. The UI labels the bridge as optional
and does not claim cross-device acceptance until physical testing is complete.

Pending approval cards also accept deliberate horizontal swipes (right to
approve, left to deny) through a tested gesture classifier. Native labeled
buttons remain available so gesture support does not replace screen-reader or
large-text access paths.

When an Android-only user queues a mission offline, the app now persists an
explicit local plan artifact, activity entry, and audit event. The evidence
records that build and verification are queued; it does not misrepresent local
planning as completed code execution.

Biometric unlock is opt-in and gates bridge-secret access through the device's
biometric/passcode prompt. Raw biometric data never enters the app; if hardware
or enrollment is unavailable, access fails closed while offline work remains
available.

The Android shell bundles Researcher, Implementer, Verifier, and Sync Guardian
roles. They use the local execution model when no bridge is connected; a bridge
can optionally provide remote execution without becoming a mobile dependency.
Desktop YOLO mode is deliberately not a mobile prerequisite: Android remains
local-first and continues to show operation state and queue evidence directly.

The command center now applies the normalized device profile to workload routing
and presents only compatible, explicitly licensed local models. Model download
policy is visible in the UI: HTTPS is required, only MIT/Apache-2.0 catalog
entries are eligible, low-storage requests are rejected before transport,
resume responses that ignore Range are handled without duplicate bytes, and
supplied checksums are verified before finalization with partial cleanup.

The desktop now includes an opt-in MCP Bridge HTTP adapter. Set
`SPARTANCODE_BRIDGE_PORT` and preferably `SPARTANCODE_BRIDGE_TOKEN` to expose
validated snapshots and approval-gated mutation routes. It binds to localhost
by default; remote access requires an explicit secure network boundary.

## Phase 3 — Device intelligence and extensibility

- Detect chipset, RAM, storage, Vulkan/NPU availability, and thermal limits.
- Add licensed GGUF catalog, resumable downloads, checksums, deletion, and
  Q4_K_M/Q4_0/Q3_K_S selection.
- Keep MLC Chat primary, with llama.cpp and PocketPal-compatible adapters behind
  a runtime interface.
- Add voice dictation, plugin/template/persona surfaces, and audit browsing.

Gate: no model downloads without an explicit compatible license; low-storage
and unavailable-accelerator states provide actionable diagnostics.

## Phase 4 — Release and long-term capabilities

- Add biometric unlock as opt-in protection for local secrets with recovery.
- Add reduced-motion, large-text, keyboard/tablet, and background-sync support.
- Add collaboration, cross-modal input, and enterprise governance only after
  the core mobile safety gates remain green.
- Produce reproducible signed APK/AAB artifacts and release notes.

Gate: clean-checkout TypeScript, unit, formatting, Expo export, Android build,
visual, accessibility, offline/reconnect, and security checks all pass.

## Non-negotiable rules

1. Never persist passwords, private keys, or raw biometric data.
2. Never execute arbitrary shell commands from Android.
3. Validate every bridge response before applying it to local state.
4. Always show offline, stale, pending, approved, denied, and failed states.
5. Only download models with explicit compatible licenses.

## Required verification matrix

Test API 29, API 33, and current stable Android; small and large phones;
tablet/landscape; offline cold start; reconnect and token expiry; bridge outage;
snapshot migration/corruption; TalkBack and large text; reduced motion; low
storage; interrupted sync/download; and process restart during an operation.

The persistent AWS replacement host is available and has produced a successful
API 35 native debug build after installing the Android SDK, NDK, CMake, and
Java toolchain. It is a `t2.large` without `/dev/kvm`; default, Google APIs, and
smaller software-only AVDs were attempted, but Android framework/package
services did not become reliable under TCG. The pinned GitHub Actions emulator
job remains the KVM-capable API-level smoke evidence. Physical-device, tablet,
TalkBack, and production-signing checks remain release-environment gates.
