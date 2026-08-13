# SpartanCode Android roadmap

This is the implementation contract for the Android version. The full product
roadmap remains [`../vibe-coding-export.txt`](../vibe-coding-export.txt); this
file turns its Android priorities into verifiable delivery gates.

## Product goal

Android is a mobile-first, offline-capable command center for missions,
approvals, artifacts, and remote workspaces. It must expose honest sync state,
keep credentials in secure storage, and never bypass approval policy.

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
and retains planning missions when a sync response arrives. QR pairing and
logout-secret deletion remain open work.

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
