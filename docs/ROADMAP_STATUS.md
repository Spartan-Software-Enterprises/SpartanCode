# SpartanCode roadmap status

`origin/main` is the canonical source of truth. This status is evidence-based:
an item is marked implemented only where the repository contains both the
behavior and a corresponding automated or documented verification path.

## Implemented foundation

- Desktop Electron shell with isolated preload IPC and workspace path/symlink
  boundaries.
- Mission Plan/Build/Verify lifecycle, durable artifacts, approvals, audit
  activity, and guided/YOLO execution modes.
- MCP Lite core tools and an optional token-protected MCP Bridge adapter.
- Durable Android snapshot/queue storage, migration and corruption quarantine,
  retry cancellation, QR pairing, token expiry, and idempotent bridge writes.
- Android standalone mission planning, bundled agent roles, artifact/approval
  state, voice dictation, biometric secret gating, audit activity, tablet and
  landscape layout support. Offline mission creation persists a local plan
  artifact and audit evidence without requiring a desktop or bridge.
- Explicitly licensed mobile model catalog, compatibility filtering, HTTPS
  resumable downloads, checksum verification, and deletion.
- Remote provider cost estimates, home-server/router guidance, connection
  profiles, AWS bootstrap/recovery scripts, and local/GitHub synchronization
  procedures.
- Antigravity-compatible workspace custom-agent discovery for Researcher,
  Implementer, Verifier, and Sync Guardian roles.

## Implemented but environment-dependent

- Linux desktop packaging and emulator smoke checks have been exercised in the
  validation environment.
- Android Expo configuration and native release automation are present, but a
  signed artifact requires release-owned Android credentials.
- AWS/KVM validation requires a reachable replacement host; the former host was
  terminated by its old auto-termination timer and is not treated as available.

## Release gates still requiring stronger evidence

- Native MLC/llama.cpp/PocketPal inference adapters and real on-device model
  execution, rather than catalog/download policy alone.
- Physical-device accessibility (TalkBack, large text, reduced motion),
  low-storage/interrupted-download/process-restart acceptance, and tablet
  hardware validation.
- Signed production AAB/APK, generated license notices, privacy/terms review,
  and release artifact checksums.
- Long-term collaboration, cross-modal gesture workflows, enterprise
  governance, and a mature external plugin marketplace.

These items remain open until their implementation and release-environment
evidence exist; passing unit tests alone does not close them.
