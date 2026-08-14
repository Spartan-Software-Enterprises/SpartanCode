# SpartanCode roadmap status

`origin/main` is the canonical source of truth. This status is evidence-based:
an item is marked implemented only where the repository contains both the
behavior and a corresponding automated or documented verification path.
The complete reconciliation against the exported 35-feature source roadmap is
in [ROADMAP_MATRIX.md](ROADMAP_MATRIX.md).
Run `npm run roadmap:audit` to validate the ordered 35-row matrix and print its
current Implemented/Partial/Open counts.

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
- Optional Proton Drive secure backup/restore now invokes the official CLI
  through a fixed non-shell boundary and encrypts workspace snapshots with an
  OS-vault-backed AES-256-GCM envelope before upload; Proton Pass can provide
  the primary backup-key reference while the OS vault remains optional recovery
  storage. See [PROTON_DRIVE.md](PROTON_DRIVE.md) and [PROTON_PASS.md](PROTON_PASS.md).
- Playwright browser requests can opt into a configured Tor SOCKS proxy; direct
  browser traffic remains the default and invalid proxy configuration fails
  closed.
- CodeRabbit is configured for GitHub-hosted pull-request review with scoped
  Electron, renderer, and Android guidance; desktop Settings opens its official
  GitHub App login flow without storing CodeRabbit credentials.
- Interaction personalization accepts only an explicit user-selected signal
  (calm, focused, frustrated, uncertain, excited, or tired) and resolves it to
  bounded tone guidance. Emotion inference from cameras, voice, or biometrics
  is disabled by contract and is never presented as available.

## Next capability expansion

- Cross-platform automation capability roadmap documented for Windows OS and
  hardware adapters, autonomous Leo execution, personas and voice, GUI
  automation, Playwright browser control, Proton/Tor adapters, and encrypted
  local RAG memory. Each slice must ship with typed capabilities, policy
  boundaries, audit evidence, and truthful unavailable states; see
  [AUTOMATION_CAPABILITIES.md](AUTOMATION_CAPABILITIES.md).

- Desktop Electron shell with isolated preload IPC and workspace path/symlink
  boundaries.
- User projects can generate a local `.devcontainer/devcontainer.json` through
  the bounded desktop API. Node, Python, Android, and universal presets are
  supported without uploading source or creating a Codespace; paths stay inside
  the approved workspace and existing definitions are protected from accidental
  overwrite. See [DEV_CONTAINERS.md](DEV_CONTAINERS.md).
- Mission Plan/Build/Verify lifecycle, durable artifacts, approvals, audit
  activity, and guided/YOLO execution modes.
- MCP Lite core tools and an optional token-protected MCP Bridge adapter.
- Durable Android snapshot/queue storage, migration and corruption quarantine,
  retry cancellation, QR pairing, token expiry, and idempotent bridge writes.
- Android standalone mission planning, bundled agent roles, artifact/approval
  state, voice dictation, biometric secret gating, audit activity, tablet and
  landscape layout support. Offline mission creation persists a local plan
  artifact and audit evidence without requiring a desktop or bridge.
- Android now has a phone-only project workspace: users can create and persist
  projects targeting Android, iOS, Windows, macOS, Linux, web, or a custom
  device/OS, then record build, verification, and packaging evidence locally.
  Each checklist entry now produces a durable local release-evidence artifact,
  activity entry, and audit event. The release checklist is explicit about
  target-specific compilation and does not claim an unavailable compiler ran on
  the phone.
- Android settings now persist the Leo default-agent preference, persona and
  wake-word preferences alongside execution, quantization, voice-input, and
  sync controls with bounded local values; the default agent participates in
  the same scoped settings hierarchy.
- Android Settings now exposes compact global/project/agent/session scope
  controls that save and load the same deterministic override hierarchy without
  requiring a desktop or bridge.
- Desktop and Android now share the same normalized settings vocabulary,
  including `apiProvider`, voice, memory, persona, wake-word, and explicit
  interaction preferences. Scope resolution applies `default` layers before
  identified layers at each level, trims bounded identifiers, and migrates the
  Android legacy `provider` field without persisting the old name.
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
- Local Android physical-device testing is documented through authorized ADB,
  including biometric, accessibility, permission, storage, restart, and
  network-transition evidence; this environment currently has no attached ADB
  device, so those checks remain release-environment gates.
- Explicitly licensed mobile model catalog, compatibility filtering, HTTPS
  resumable downloads, safe Range fallback, low-storage preflight, checksum
  verification/cleanup, and deletion. Android also accepts explicitly
  selected Hugging Face community metadata, preserving declared licenses and
  uncensored/distilled flags without applying the built-in license filter; the
  phone UI can search the bounded Hugging Face API, select results, and save
  and reload that metadata offline. Search is HTTPS-only, result-bounded, and
  fails closed on malformed or unavailable responses.
- Desktop Hugging Face search now matches the bounded contract with a 200
  character query limit, 50-result cap, ten-second abort timeout, and explicit
  malformed-response handling. Model byte downloads and runtime availability
  remain environment-dependent.
- Desktop model caching now has an explicit HTTPS download boundary with
  resumable `Range` support, safe fallback when a server returns `200`, bounded
  artifact size, SHA-256 verification before finalization, and cleanup on
  mismatch. Runtime loading and physical storage acceptance remain open.
- Desktop runtime requests can now resolve a ready, verified cached model by
  model ID into the existing local GGUF runtime boundary; unavailable or
  metadata-only entries fail closed instead of being treated as runnable.
- The Playwright Electron visual smoke suite now records its commit, views,
  warnings, renderer errors, and screenshot inventory in `result.json`; the
  release-index generator can promote that gate to `PASS` only when the result
  matches the release commit and contains the required evidence.
- `scripts/release-index.js` now generates a commit-bound machine-readable beta
  gate index, preserves `PASS`/`SKIP`/`FAIL` states, and fails closed when
  Android verification evidence belongs to another commit. External release
  gates remain intentionally open until their evidence exists.
- Remote provider cost estimates, home-server/router guidance, connection
  profiles, bounded desktop/Android home-server setup plans, AWS
  bootstrap/recovery scripts, and local/GitHub synchronization procedures.
  Setup plans remain guidance-only and require the user to review and execute
  commands on a host they control; see [HOME_SERVER_SETUP.md](HOME_SERVER_SETUP.md).
- Artifact synchronization now has a bounded desktop bridge and Android
  three-way merge contract. Android persists the last remote base across
  refreshes, reconciles its phone snapshot, and falls back safely for older
  bridges. One-sided edits apply automatically; divergent edits are returned
  as explicit conflicts with base/phone/bridge visibility for review, while
  Proton Drive remains encrypted backup/restore rather than a plaintext sync
  transport.
  Android now has a bounded continuous polling loop with failure backoff and
  overlap prevention. Physical cross-device acceptance remains open;
  see [ARTIFACT_SYNC.md](ARTIFACT_SYNC.md).
- Signed marketplace plugins now support verified staging, explicit activation,
  matching deactivation, and an opt-in Node runtime boundary that requires
  matching activated metadata, Node permissions, no shell/addons/child
  processes, bounded I/O, and timeout termination. Declarative plugins remain
  non-executable. A dependency-free publisher helper now validates manifests,
  generates Ed25519 keys, and signs canonical catalogs without overwriting
  existing key/index files; publisher governance is now explicitly documented,
  while hosted distribution and operational adoption remain open. See
  [PLUGIN_AUTHORING.md](PLUGIN_AUTHORING.md) and
  [PLUGIN_GOVERNANCE.md](PLUGIN_GOVERNANCE.md).
- Desktop and Android now share a documented normalized settings contract for
  global/project/agent/session scopes, including `apiProvider` and `autoSync`.
  Both clients use deterministic default-then-identified precedence and ignore
  invalid scoped overrides; Android migrates the legacy `provider` field. The
  Android effective-value preview remains available, while physical acceptance
  is still an environment gate. See [SETTINGS_HIERARCHY.md](SETTINGS_HIERARCHY.md).
- The authenticated MCP Bridge exposes bounded Git status, redacted diff,
  stage, and explicit commit operations with separate read/write scopes and
  idempotent mutation handling for remote clients.
- A loopback integration harness now exercises two independently authenticated
  bridge clients against real temporary Git state, three-way artifact conflicts,
  collaboration revision conflicts, and idempotent retries. Physical
  cross-device acceptance remains a separate gate.
- Android exposes optional authenticated-bridge controls for remote Git status,
  redacted diff, stage, and explicit commit operations. Core Android use stays
  standalone and does not require the desktop app or bridge; physical Android
  acceptance remains an environment gate.
- The VS Code extension now exposes authenticated, SecretStorage-backed Git
  status, redacted diff, stage, and explicit commit commands with bounded
  output and commit messages.
- VS Code synchronization now persists a bounded, revision-aware snapshot
  envelope with status counts, requires a SecretStorage token for every bridge
  request, bounds bridge responses, and surfaces the current remote revision
  when collaboration note writes lose an optimistic-concurrency race.
- The desktop host now exposes a bounded, approved-workspace VS Code project
  importer. It parses JSONC settings, tasks, and launch files into metadata
  summaries, omits command/argument values and secret values, rejects oversized
  or symlinked configuration, and never executes imported tasks.
- Mosh now has a tested client lifecycle contract with explicit connecting,
  ready, error, ended, stop, and server-requirement states. The host still
  must provide `mosh-server` and reachable UDP ports before a real session can
  be accepted.
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
  component inventory for desktop and Android release workflows. The
  independent `scripts/verify-release-evidence.js` gate now fail-closes on
  modified/missing artifacts, path traversal, missing control-evidence sources,
  incomplete notices, and a manifest commit that differs from the checkout.
- A guarded manual/tag Android release workflow now provisions Java/Android
  tooling, consumes release-owned keystore secrets only in the runner
  temporary directory, and uploads signed AAB/APK plus release evidence.
- A clean-checkout GitHub Actions workflow and local Android verification
  matrix now run the repeatable TypeScript/Jest/format/Expo baseline and record
  Android SDK/emulator, signing, and AWS environment gaps as explicit skips.
- GitHub verification now includes a pinned Electron/Playwright visual job that
  exercises every desktop navigation view and the mission composer, uploads
  screenshot evidence, fails on renderer errors, and enforces bounded launch,
  interaction, navigation, and process timeouts.
- GitHub verification now also includes a bounded API 30 Android emulator job
  that provisions and boots an AVD with explicit SDK commands, builds the debug
  native binary, installs it, launches the package, and verifies package
  registration on pull requests and manual full-verification dispatches. SDK installation, emulator
  startup, and package verification are individually bounded for diagnosable
  failure evidence.
- CI minute protection keeps the expensive visual and emulator jobs on pull
  requests and manual full-verification dispatches; ordinary `main` pushes run
  the fast desktop and Android static gates. Documentation and screenshot-only
  changes do not start the verification workflow.
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
  into a bounded SHA-256-verified staging cache; the main process binds
  download, activation, deactivation, and execution to the exact normalized
  entry from the verified index. Extraction, update replacement, and
  execution remain review gates. The index contract is documented in
  `docs/PLUGIN_MARKETPLACE.md`.
- Major coding-program extension and connector compatibility is now specified
  for VS Code-compatible tools, JetBrains/Android Studio, Visual Studio,
  Eclipse, Xcode, Neovim/Vim, Emacs, Sublime, Zed, terminal coding agents,
  and developer-service connectors. Adapter implementation and ecosystem
  governance remain partial. A bounded shared adapter-manifest validator now
  provides normalized host, target, operation, permission, execution-boundary,
  provenance, and test-coverage declarations. Tested read-only importers now
  cover VS Code JSONC, JetBrains `.idea`, Visual Studio solution/project, and
  Eclipse and Xcode/Swift Package project metadata plus Neovim/Vim/Emacs/Zed
  configuration metadata, including bounded Sublime project/workspace and
  terminal-agent summaries for Aider, OpenCode, Cline, Continue, Roo, AGENTS.md,
  Claude, Gemini, Windsurf, GitHub Copilot, Cursor, Codeium, Amazon Q, Kiro,
  Augment, Goose, and Factory formats, redaction,
  signing-metadata rejection, symlink rejection, and no-execution guarantees;
  the remaining ecosystem importers and governance remain next. See
  `docs/EXTENSION_CONNECTOR_COMPATIBILITY.md`.
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
- Android Expo configuration and native release automation are present. A
  dedicated release key is configured in the GitHub Actions secret store and
  was validated on AWS by producing signed AAB/APK artifacts; the private
  keystore remains outside the repository. This proves signing capability, not
  public distribution approval.
- AWS validation is available on the active KVM-capable replacement host with
  a 512-GiB root volume, default VPC security group only, stop/termination
  protection, a verified `origin/main` synchronization timer, installed Java/
  Android SDK API 35 tooling, and a successful native debug build. The
  preserved legacy `t2.large` fallback exposes no `/dev/kvm`; its software-only
  AVD attempts were unreliable. KVM emulator evidence must identify the active
  replacement host, while cost monitoring and AWS credit balance remain
  external release-environment checks.
- The active KVM host has both `mosh-server` and `mosh-client` installed and
  its loopback lifecycle has been exercised. Security-group UDP reachability
  and physical terminal behavior remain external acceptance gates.

## Release gates still requiring stronger evidence

- Mobile-only release parity remains a first-class gate: an Android-only user
  must be able to create a project targeting any supported device or operating
  system, run the available verification/build steps, package it, and prepare
  release evidence without installing the desktop app, a server, or a bridge.

- MLC Chat/PocketPal provider-specific packages and physical Android execution
  remain release-environment gates. Android now has a real llama.cpp native
  adapter when a prebuilt binary and existing GGUF model are supplied; the
  adapter reports unavailable until those inputs exist. Desktop has the same
  verified CLI fallback through `SPARTANCODE_LLAMA_CLI`.
- Physical-device accessibility acceptance (TalkBack behavior and visual
  verification of large text/reduced motion),
  low-storage/interrupted-download/process-restart acceptance, and tablet
  hardware validation.
- Public distribution approval, physical-device evidence, dependency review,
  and legal/privacy review remain release-environment gates. The signed
  AAB/APK capability is verified; signing does not equal distribution approval.
- Physical Android collaboration/gesture acceptance, cross-modal expansion,
  provider-specific OIDC account lifecycle/administration, marketplace artifact
  installation/activation/updates, and a mature external plugin marketplace.
- GitHub App production registration, hosted manifest callback/webhooks, and
  user-authorized Codespaces lifecycle remain deployment gates.

These items remain open until their implementation and release-environment
evidence exist; passing unit tests alone does not close them.
