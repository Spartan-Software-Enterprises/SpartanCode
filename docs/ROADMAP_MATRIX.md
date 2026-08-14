# Source roadmap reconciliation

This matrix reconciles the 35 feature rows in
[`vibe-coding-export.txt`](../vibe-coding-export.txt) with repository evidence.
`Implemented` means the behavior and automated/documented verification exist.
`Partial` means a bounded foundation exists but the complete product capability
or release evidence is still open. `Open` means no repository implementation
should be presented as complete.

| # | Source-roadmap feature | Status | Evidence or remaining work |
|---:|---|---|---|
| 1 | MCP Lite | Implemented | `src/main/mcp-lite.js` and tests |
| 2 | Local model cache/offline mode | Implemented | Desktop cache and Android offline runtime/queue tests |
| 3 | Inline suggestions and AI chat | Implemented | Chat service, renderer surface, and provider tests |
| 4 | Plan/execute/verify orchestrator | Implemented | Mission/orchestrator lifecycle tests |
| 5 | Hugging Face model discovery/download | Partial | Catalog, metadata, filtering, and bounded download exist; runtime/model availability remains environment-dependent |
| 6 | SQLite artifact store | Implemented | `src/main/artifact-store.js` and SQLite schema tests |
| 7 | Settings hierarchy | Partial | Persistent global/project/agent/session layers and resolution API exist; full user-facing editor for every layer remains open |
| 8 | Human-in-the-loop dangerous-command approval | Implemented | Policy engine, mission approval, and audit tests |
| 9 | QR pairing | Implemented | Android pairing validation, expiry, and storage tests |
| 10 | SSH/Mosh terminal fallback | Partial | SSH foundation plus truthful Mosh client detection/tokenized launch arguments exist; interactive Mosh terminal lifecycle and server-side acceptance remain open |
| 11 | Git operations with AI commit messages | Partial | Bounded Git operations, redacted diff/provider-backed suggestions, and a desktop review/stage/explicit-commit panel are implemented; richer provider configuration and cross-client parity remain open |
| 12 | Biometric authentication | Partial | Android biometric gate exists; physical device recovery/accessibility evidence remains open |
| 13 | React Native mobile adaptation | Implemented | Android Expo app, standalone queue, and CI emulator smoke |
| 14 | NPU/GPU/chipset detection | Implemented | Normalized Android device probe and diagnostics |
| 15 | Voice dictation | Implemented | Expo speech-recognition adapter with unavailable/error states |
| 16 | Home-server setup assistant | Partial | Provider-neutral guidance exists; provisioning is intentionally not automatic |
| 17 | Remote development server connection | Implemented | Connection profiles and bounded SSH/remote adapter |
| 18 | MCP Bridge | Implemented | Authenticated, scoped, approval-aware HTTP bridge |
| 19 | Artifact synchronization | Partial | Durable queue and bridge merge exist; physical cross-device acceptance remains open |
| 20 | Connection profiles | Implemented | Validated persisted profiles and settings surface |
| 21 | Cost estimation | Implemented | Provider-neutral estimates and tests |
| 22 | Router traversal guidance | Implemented | Tailscale/UPnP/router guidance without silent network changes |
| 23 | Plugin marketplace | Partial | Signed index and digest-verified staging exist; activation/update marketplace lifecycle remains gated |
| 24 | Agent persona library | Implemented | Leo default plus bundled persona/custom-agent metadata |
| 25 | Template library | Implemented | Offline-safe starter templates and Android extension metadata |
| 26 | VS Code synchronization | Partial | `extensions/vscode` provides authenticated snapshot sync and mission handoff; full editor parity and marketplace distribution remain open |
| 27 | Audit viewer/transparency | Implemented | Desktop/Android audit activity and redacted export |
| 28 | Documentation and onboarding | Implemented | README, About surfaces, feature docs, verification matrix, and release docs |
| 29 | Beta release/feedback loop | Partial | Release-evidence and CI foundations exist; public beta operations and feedback loop remain open |
| 30 | Cross-modal input | Implemented | Voice input and tested approval gestures with labeled controls |
| 31 | Emotion-aware interaction | Open | Not implemented; no safe, documented product contract exists |
| 32 | Multi-user collaboration | Partial | Revisioned local/bridge collaboration exists; physical acceptance and deployment lifecycle remain open |
| 33 | AR/VR integration | Open | Not implemented |
| 34 | Mature external plugin ecosystem | Partial | Registry/marketplace safety foundation exists; community ecosystem is not established |
| 35 | Enterprise SSO/audit/compliance | Partial | OIDC/SSO, scopes, audit export, and compliance docs exist; production administration/legal review remain open |

The authoritative release and environment gates are maintained in
[`ROADMAP_STATUS.md`](ROADMAP_STATUS.md). This matrix deliberately keeps
unsupported or environment-dependent capabilities visible instead of counting
stubs, intent, or skipped tests as completion.
