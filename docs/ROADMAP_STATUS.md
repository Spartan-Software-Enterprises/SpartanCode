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
- Android reads system reduced-motion, font-scale, and screen-reader settings
  without overriding them and surfaces the resulting accessibility state.
- Explicitly licensed mobile model catalog, compatibility filtering, HTTPS
  resumable downloads, checksum verification, and deletion.
- Remote provider cost estimates, home-server/router guidance, connection
  profiles, AWS bootstrap/recovery scripts, and local/GitHub synchronization
  procedures.
- Antigravity-compatible workspace custom-agent discovery for Researcher,
  Implementer, Verifier, and Sync Guardian roles.
- A tested runtime adapter contract and desktop IPC boundary for llama.cpp,
  MLC Chat, PocketPal, and WebLLM. Installed runtimes are invoked only when
  they expose the explicit `generate` contract; unavailable runtimes report a
  typed result instead of being presented as ready.
- Reproducible release-evidence generation now records the Git commit,
  SHA-256 hashes for scanned artifacts, and a lockfile-derived third-party
  component inventory for desktop and Android release workflows.

## Implemented but environment-dependent

- Linux desktop packaging and emulator smoke checks have been exercised in the
  validation environment.
- Android Expo configuration and native release automation are present, but a
  signed artifact requires release-owned Android credentials.
- AWS/KVM validation requires a reachable replacement host; the former host was
  terminated by its old auto-termination timer and is not treated as available.

## Release gates still requiring stronger evidence

- Native MLC/llama.cpp/PocketPal inference packages and real on-device model
  execution are still required; the current adapter boundary and detection do
  not claim that an optional runtime is installed.
- Physical-device accessibility acceptance (TalkBack behavior and visual
  verification of large text/reduced motion),
  low-storage/interrupted-download/process-restart acceptance, and tablet
  hardware validation.
- Signed production AAB/APK and legal/privacy review remain release-environment
  gates. The generator itself is implemented and verified; its inventory and
  hashes must still be attached to the signed release and reviewed for the
  target distribution.
- Long-term collaboration, cross-modal gesture workflows, enterprise
  governance, and a mature external plugin marketplace.

These items remain open until their implementation and release-environment
evidence exist; passing unit tests alone does not close them.
