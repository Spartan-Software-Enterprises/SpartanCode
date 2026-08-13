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
- Android now has a local collaboration session surface with validated
  persistence and optional bridge publication/remote-session merge; physical
  cross-device acceptance remains open.
- Android now has a typed MLC Chat/PocketPal/llama.cpp native-module registry
  that checks device-compatible licensed models before invocation and reports
  missing modules honestly; native package installation remains open.
- Android pending approvals support tested horizontal swipe decisions in
  addition to accessible labeled controls; physical gesture/accessibility
  acceptance remains open.
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
- A bounded plugin registry now discovers workspace metadata, enforces explicit
  MIT/Apache-2.0 licensing and safe capability identifiers, preserves bundled
  plugins, and exposes metadata through isolated IPC without executing plugin
  code.
- Desktop audit export now emits bounded, credential-redacted, SHA-256-verified
  governance bundles through isolated IPC.
- The authenticated MCP Bridge also exposes the same redacted audit bundle for
  remote governance consumers without exposing workspace credentials.
- The MCP Bridge supports opt-in least-privilege token scopes for snapshot,
  audit, event, collaboration, mission, approval, and artifact operations;
  plain local-development tokens retain backward-compatible trusted behavior.
- Desktop now has a durable, versioned collaboration journal with owner/member/
  observer roles, optimistic revision conflict detection, idempotent event
  merge, and audit-log persistence through the workspace store. Transport to
  other devices is now available through authenticated MCP Bridge session,
  participant, event, and merge routes; physical cross-device acceptance
  testing remains open.

## Implemented but environment-dependent

- Linux desktop packaging and emulator smoke checks have been exercised in the
  validation environment.
- Android Expo configuration and native release automation are present, but a
  signed artifact requires release-owned Android credentials.
- AWS/KVM validation requires a reachable replacement host; the former host was
  terminated by its old auto-termination timer and is not treated as available.

## Release gates still requiring stronger evidence

- Android MLC/PocketPal inference packages and physical on-device execution are
  still required. Desktop now has a real llama.cpp CLI adapter when an absolute
  `SPARTANCODE_LLAMA_CLI` executable and existing GGUF model are supplied; the
  adapter reports unavailable until those inputs exist.
- Physical-device accessibility acceptance (TalkBack behavior and visual
  verification of large text/reduced motion),
  low-storage/interrupted-download/process-restart acceptance, and tablet
  hardware validation.
- Signed production AAB/APK and legal/privacy review remain release-environment
  gates. The generator itself is implemented and verified; its inventory and
  hashes must still be attached to the signed release and reviewed for the
  target distribution.
- Physical Android collaboration/gesture acceptance, cross-modal expansion,
  OIDC/SSO provider integration, and a mature external plugin marketplace.

These items remain open until their implementation and release-environment
evidence exist; passing unit tests alone does not close them.
