# SpartanCode roadmap status

`origin/main` is the canonical source of truth. This status is evidence-based:
an item is marked implemented only where the repository contains both the
behavior and a corresponding automated or documented verification path.
The complete reconciliation against the exported 35-feature source roadmap is
in [ROADMAP_MATRIX.md](ROADMAP_MATRIX.md).

## Implemented foundation

- Desktop project previews open loopback HTTP(S) development servers in a
  native built-in browser window with popup and navigation guards. Playwright
  visual smoke coverage verifies the preview dialog’s local-only boundary, and
  Prettier remains enforced in the desktop test gate.
- A typed Playwright browser-automation adapter now supports bounded navigation
  and text extraction with explicit domain allowlists, timeout/text limits,
  download blocking, redacted activity evidence, and honest Chromium
  availability reporting.
- Three requested external skill repositories are pinned in
  `config/external-skills.json`, can be synchronized with `npm run skills:sync`,
  and are indexed through a metadata-only registry that marks risky or
  unlicensed content for review without executing imported scripts.
- Encrypted local vector memory is implemented with bounded records, secret-like
  content rejection, OS-backed vault encryption, retrieval, deletion, clear,
  and a user-facing enable/disable setting.
- A Windows system-automation contract now reports platform availability and
  supports bounded read-only PowerShell inspection through fixed executable
  arguments; write-capability and GUI adapters remain explicitly gated work.
- A cross-platform GUI automation status contract reports Windows UI Automation
  and PyAutoGUI availability without enabling arbitrary screen control; actions
  remain review-required until a capability-specific audited adapter exists.
- A bounded native text-to-speech adapter exposes fixed platform commands,
  length limits, and truthful missing-runtime status through isolated IPC.
- A privacy-network adapter reports Tor/Proton configuration without exposing
  credentials and refuses to silently reroute traffic.
- Playwright browser requests can opt into a configured Tor SOCKS proxy; direct
  browser traffic remains the default and invalid proxy configuration fails
  closed.
- CodeRabbit is configured for GitHub-hosted pull-request review with scoped
  Electron, renderer, and Android guidance; desktop Settings opens its official
  GitHub App login flow without storing CodeRabbit credentials.

## Next capability expansion

- Cross-platform automation capability roadmap documented for Windows OS and
  hardware adapters, autonomous Leo execution, personas and voice, GUI
  automation, Playwright browser control, Proton/Tor adapters, and encrypted
  local RAG memory. Each slice must ship with typed capabilities, policy
  boundaries, audit evidence, and truthful unavailable states; see
  [AUTOMATION_CAPABILITIES.md](AUTOMATION_CAPABILITIES.md).

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
- Android settings now persist Leo persona and wake-word preferences alongside
  execution, quantization, voice-input, and sync controls with bounded local
  values.
- Android now includes an optional Expo Speech output adapter with bounded
  voice-test text and a visible unavailable/error fallback.
- Android now includes a SecureStore-key-backed AES-256-GCM offline-content
  primitive with tamper detection, bounded payloads, cleanup, and automated
  tests. Legacy plaintext snapshots are migrated and removed on first read;
  devices that truthfully lack the crypto runtime retain a compatibility path
  and report the unavailable state in settings.
- Android reads system reduced-motion, font-scale, and screen-reader settings
  without overriding them and surfaces the resulting accessibility state.
- Android now has a local collaboration session surface with validated
  persistence, revision-checked local event append, and optional bridge
  publication with idempotent retry queuing/remote-session merge; physical
  cross-device acceptance remains open.
- Android now has a typed MLC Chat/PocketPal/llama.cpp native-module registry
  that checks device-compatible licensed models before invocation and reports
  missing modules honestly. The MIT-licensed `@pocketpalai/llama.rn` package is
  integrated through the Expo config plugin as the first real native adapter;
  MLC Chat/PocketPal remain optional provider adapters.
- Android pending approvals support tested horizontal swipe decisions in
  addition to accessible labeled controls; physical gesture/accessibility
  acceptance remains open.
- Explicitly licensed mobile model catalog, compatibility filtering, HTTPS
  resumable downloads, safe Range fallback, low-storage preflight, checksum
  verification/cleanup, and deletion.
- Remote provider cost estimates, home-server/router guidance, connection
  profiles, AWS bootstrap/recovery scripts, and local/GitHub synchronization
  procedures.
- Antigravity-compatible workspace custom-agent discovery for Researcher,
  Implementer, Verifier, and Sync Guardian roles.
- A tested runtime adapter contract and desktop IPC boundary for llama.cpp,
  MLC Chat, PocketPal, and WebLLM. Installed runtimes are invoked only when
  they expose the explicit `generate` contract; unavailable runtimes report a
  typed result instead of being presented as ready. Runtime listings now also
  expose whether an adapter came from a node module, system path, or explicit
  configured path.
- Reproducible release-evidence generation now records the Git commit,
  SHA-256 hashes for scanned artifacts, and a lockfile-derived third-party
  component inventory for desktop and Android release workflows.
- A guarded manual/tag Android release workflow now provisions Java/Android
  tooling, consumes release-owned keystore secrets only in the runner
  temporary directory, and uploads signed AAB/APK plus release evidence.
- A clean-checkout GitHub Actions workflow and local Android verification
  matrix now run the repeatable TypeScript/Jest/format/Expo baseline and record
  Android SDK/emulator, signing, and AWS environment gaps as explicit skips.
- GitHub verification now includes a pinned Electron/Playwright visual job that
  exercises every desktop navigation view and the mission composer, uploads
  screenshot evidence, and fails on renderer errors.
- GitHub verification now also includes a bounded API 30 Android emulator job
  that provisions and boots an AVD with explicit SDK commands, builds the debug
  native binary, installs it, launches the package, and verifies package
  registration on every push and pull request.
- Optional GitHub App foundation with installation-token repository access,
  least-privilege manifest defaults, and a Codespaces-compatible dev container
- Desktop secure local vault with OS-backed key wrapping, AES-256-GCM records,
  tamper detection, no plaintext fallback, and settings controls; Android
  bridge secrets remain in SecureStore/Keystore with optional biometric gating.
- Full Hugging Face discovery and preparation includes community, uncensored,
  and distilled model metadata; built-in commercial filtering remains available
  for distribution-safe workflows.
- API agent gateway covers OpenAI, Anthropic, Gemini, Mistral, Groq, xAI,
  DeepSeek, Together, OpenRouter, Fireworks, Cohere, and Perplexity through
  isolated provider adapters with secure-key integration.
- A bounded plugin registry now discovers workspace metadata, enforces explicit
  MIT/Apache-2.0 licensing and safe capability identifiers, preserves bundled
  plugins, and exposes metadata through isolated IPC without executing plugin
  code.
- Desktop can fetch a bounded, HTTPS-only, Ed25519-signed marketplace index
  through isolated IPC. Entries require explicit license, safe capabilities,
  source URL, and artifact SHA-256 fields. A selected entry can be downloaded
  into a bounded SHA-256-verified staging cache; extraction, activation, update
  replacement, and execution remain review gates. The index contract is
  documented in `docs/PLUGIN_MARKETPLACE.md`.
- Desktop audit export now emits bounded, credential-redacted, SHA-256-verified
  governance bundles through isolated IPC.
- The authenticated MCP Bridge also exposes the same redacted audit bundle for
  remote governance consumers without exposing workspace credentials.
- The MCP Bridge supports opt-in least-privilege token scopes for snapshot,
  audit, event, collaboration, mission, approval, and artifact operations;
  plain local-development tokens retain backward-compatible trusted behavior.
- The MCP Bridge supports explicitly configured OIDC/SSO JWT authentication
  with issuer, audience, expiry, RS256 signature, cached JWKS, and claim-scope
  verification; local tokens remain available for local development.
- Desktop now has a durable, versioned collaboration journal with owner/member/
  observer roles, optimistic revision conflict detection, idempotent event
  merge, and audit-log persistence through the workspace store. Transport to
  other devices is now available through authenticated MCP Bridge session,
  participant, event, and merge routes; physical cross-device acceptance
  testing remains open.
- Security review hardened the bridge boundary: non-loopback listeners require
  a token or complete OIDC configuration, unauthenticated handler instances
  fail closed, bridge mission requests reuse the desktop approval policy, and
  Android bridge mutations/queued synchronization honor the biometric gate.
  GitHub Actions in the release and verification workflows are pinned to
  reviewed immutable commit SHAs. Remaining release hardening is limited to
  provider-specific runtime provenance attestations and physical/device-
  environment evidence rather than being represented as complete.
- The legacy mission-plan executor now rejects shell metacharacters and uses
  bounded, tokenized `execFile` launches; the current standard security review
  recorded no reportable findings, with delegated-worker coverage explicitly
  documented as unavailable in this environment.
- Workspace verification now records the canonical root and rejects missing,
  non-directory, path-escape, and symlink-escape targets before file access.
- Dependency review is documented in [DEPENDENCY_AUDIT.md](DEPENDENCY_AUDIT.md):
  desktop production dependencies are clean, while Android has 18 transitive
  Expo/React Native toolchain findings that require a compatibility-tested
  major upgrade rather than an unsafe forced fix.

## Implemented but environment-dependent

- Linux desktop packaging has been exercised in the local validation
  environment; Android emulator smoke checks are delegated to the pinned
  GitHub Actions API 30 job because no Android SDK/emulator is currently
  available locally.
- Android Expo configuration and native release automation are present, but a
  signed artifact requires release-owned Android credentials.
- AWS validation is available on the persistent replacement host with a
  512-GiB root volume, default VPC security group only, stop/termination
  protection, a verified `origin/main` synchronization timer, installed Java/
  Android SDK API 35 tooling, and a successful native debug build. This `t2`
  host exposes no `/dev/kvm`; multiple software-only AVD images were unable to
  finish Android framework/package-service startup, so emulator install/launch
  remains an environment gate. Cost monitoring is configured, but AWS credit
  balance and billing remain external release-environment checks.

## Release gates still requiring stronger evidence

- MLC Chat/PocketPal provider-specific packages and physical Android execution
  remain release-environment gates. Android now has a real llama.cpp native
  adapter when a prebuilt binary and existing GGUF model are supplied; the
  adapter reports unavailable until those inputs exist. Desktop has the same
  verified CLI fallback through `SPARTANCODE_LLAMA_CLI`.
- Physical-device accessibility acceptance (TalkBack behavior and visual
  verification of large text/reduced motion),
  low-storage/interrupted-download/process-restart acceptance, and tablet
  hardware validation.
- Signed production AAB/APK and legal/privacy review remain release-environment
  gates. The generator and CI handoff are implemented and locally validated;
  the workflow still requires real release secrets and its signed artifacts
  must be reviewed for the target distribution.
- Physical Android collaboration/gesture acceptance, cross-modal expansion,
  provider-specific OIDC account lifecycle/administration, marketplace artifact
  installation/activation/updates, and a mature external plugin marketplace.
- GitHub App production registration, hosted manifest callback/webhooks, and
  user-authorized Codespaces lifecycle remain deployment gates.

These items remain open until their implementation and release-environment
evidence exist; passing unit tests alone does not close them.
