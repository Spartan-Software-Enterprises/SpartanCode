# Automation capability roadmap

SpartanCode can grow into a cross-platform engineering operator, but each
capability must be implemented as a typed adapter with a visible policy
boundary, audit evidence, and a truthful unavailable state. The following
capabilities are now part of the roadmap.

| Capability                          | Planned integration                                                                                          | Boundary                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Windows hardware and OS integration | PowerShell, Win32, services, network, and device adapters                                                    | Windows-only adapters; dangerous system changes remain policy-gated and audited             |
| Autonomous execution                | Leo creates bounded plans and dispatches typed tools across the workspace, OS, and approved network services | Per-tool capability grants, timeouts, cancellation, and approval gates                      |
| Dynamic personas and voice          | Persona profiles, configurable wake name, TTS voices, and STT providers                                      | Local-first audio where available; microphone and speaker access are explicit capabilities  |
| Software and GUI automation         | Process management plus Windows UI Automation and optional PyAutoGUI adapter                                 | Foreground-window and screen-control actions are high-risk and require verification         |
| Browser control                     | Playwright browser adapter for navigation, extraction, and web workflows                                     | Separate browser context, domain allowlist, download limits, and auditable actions          |
| Proton and Tor                      | Optional privacy-network adapters for Tor routing and Proton services                                        | Never silently reroute traffic; show connection state and require user configuration        |
| Continuous learning / RAG           | Encrypted local vector memory for preferences, context, and successful workflows                             | User-owned memory, inspect/export/delete controls, retention limits, and no secret indexing |

These are capability adapters, not unrestricted “god mode.” The existing YOLO
setting can bypass the interactive mission prompt only; it does not disable
input validation, containment, network restrictions, audit logging, or typed
capability checks.

The built-in project-preview browser, Playwright adapter, encrypted local RAG
memory, persona/wake-word settings, bounded native TTS contract, a Windows
PowerShell read-only adapter contract, and an explicit Tor/Proton status
boundary are now implemented foundations. Windows and GUI write-capability
adapters and Proton service operations remain platform-specific slices. Tor
browser routing is now available only through an explicit per-request opt-in
and configured SOCKS proxy. A
cross-platform process adapter now exposes non-shell launch only through an
explicit executable allowlist; GUI actions and network routing must likewise
report unavailable or review-required rather than being presented as ready
when their runtime is absent.
