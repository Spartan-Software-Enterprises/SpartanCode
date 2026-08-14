# SpartanCode — Your Local-First AI Engineering Workspace

Optional GitHub App integration adds installation-scoped repository access and
is documented in [docs/GITHUB_APP.md](docs/GITHUB_APP.md). Codespaces is an
optional user-authorized workspace target; the desktop and Android apps do not
depend on it.

GitHub is never required: local workspaces, mission history, and offline
planning remain available on-device. Advanced desktop settings can save
credentials in OS-backed encrypted storage; Android bridge secrets use the
platform secure store and optional biometrics.

Turn an idea into a verified software change with a calm, focused command
center for missions, custom agents, local models, artifacts, and review. The
Spartan IDE theme keeps the workspace dark, readable, and purpose-built for
serious engineering on desktop or Android.

Desktop project previews open local development servers in SpartanCode’s
built-in browser window. The preview surface is loopback-only by default and is
covered by the Playwright visual smoke suite; Prettier formatting is enforced
in the desktop test gate. See [project previews](docs/PROJECT_PREVIEWS.md).
CodeRabbit review configuration and GitHub App login are documented in
[docs/CODERABBIT.md](docs/CODERABBIT.md).

SpartanCode is local-first and standalone by design: Android users do not need
the desktop app, a bridge, or a network connection to plan, queue, review, and
track work. Optional remote connectivity is an extension—not a dependency.

![SpartanCode desktop command center](docs/assets/spartancode-workspace.png)

The command center brings missions, agent stages, artifacts, and live status
into one focused workspace.

## See the workspace in action

Explore the workspace surfaces:

| Command center                                                       | Projects                                                           | Agent manager                                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| ![Command center](docs/assets/desktop-menu-gallery/desktop-home.png) | ![Projects](docs/assets/desktop-menu-gallery/desktop-projects.png) | ![Agent manager](docs/assets/desktop-menu-gallery/desktop-agents.png) |

| Artifact review                                                            | Workspace settings                                                           | Spartan assistant                                                              |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| ![Artifact review](docs/assets/desktop-menu-gallery/desktop-artifacts.png) | ![Workspace settings](docs/assets/desktop-menu-gallery/desktop-settings.png) | ![Assistant menu](docs/assets/desktop-menu-gallery/desktop-menu-assistant.png) |

![Settings governance and extensibility](docs/assets/desktop-menu-gallery/desktop-settings-governance.png)

| Mission composer                                                                  | Android command center                                            | Android mission queue                                             |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| ![Mission composer](docs/assets/desktop-menu-gallery/desktop-composer-filled.png) | ![Android command center](android/screenshots/command-center.png) | ![Android mission queued](android/screenshots/mission-queued.png) |

The Android command center puts offline mission queueing, optional bridge
connection, approval visibility, and the mobile Spartan IDE experience on one
screen. The queued-mission view shows the handoff from idea to tracked work;
the companion also includes voice input, local collaboration, full Hugging Face
model discovery, device diagnostics, and remote planning controls.

## Why teams use SpartanCode

- **Mission-driven development:** describe the outcome, follow planning,
  implementation, verification, and artifact review as visible stages.
- **Custom agent teams:** add workspace-scoped Researcher, Implementer,
  Verifier, or your own compatible agent definitions without coupling the app
  to a hosted service.
- **Model freedom:** discover Hugging Face models, including community,
  uncensored, and distilled variants, while preserving repository metadata.
- **Agent API choice:** route optional cloud-agent requests through OpenAI,
  Anthropic, Gemini, Mistral, Groq, xAI, DeepSeek, Together, OpenRouter,
  Fireworks, Cohere, or Perplexity; keys remain local and encrypted.
- **Evidence you can trust:** inspect artifacts, approvals, activity, audit
  exports, screenshots, test output, and release evidence in one place.
- **Android independence:** carry the command center in your pocket with
  offline missions, approvals, collaboration sessions, voice input, and device
  readiness diagnostics.
- **Safe extensibility:** optional bridges, remote planning, plugins, and
  marketplace metadata are bounded, validated, and never required for core
  workflows.

## Development

```bash
npm install
npm run dev
```

The desktop shell uses Electron with a context-isolated preload bridge. Mission
state is persisted in the Electron user-data directory. Local workspace tools
are restricted to the selected workspace, including symlink escape protection.

## Source of truth and development synchronization

`origin/main` on GitHub is the canonical SpartanCode source of truth:
<https://github.com/Spartan-Software-Enterprises/SpartanCode>. The AWS
development checkout is a validation mirror, not an independent branch. The
active replacement host must be supplied through the documented operational
environment; the former `54.152.46.218` checkout is retired.

Before starting work, update local `main` from `origin/main`. Before handing
off work, commit all intended changes, push `main`, fast-forward the AWS
checkout, and verify that both checkouts report the same commit. Never force
push, reset a worktree, or overwrite uncommitted changes to resolve drift.
The detailed procedure, recovery steps, and verification commands are in
[`docs/SYNC_WORKFLOW.md`](docs/SYNC_WORKFLOW.md).

All work must finish with a clean local and AWS worktree. If a conflict or
unexpected change is found, stop and preserve the divergent commit or worktree
before reconciling it.

## For builders

SpartanCode is open for thoughtful extension. Start with the development
commands below, then see [`docs/ROADMAP_STATUS.md`](docs/ROADMAP_STATUS.md) and
[`docs/VERIFICATION_MATRIX.md`](docs/VERIFICATION_MATRIX.md) for engineering
records and delivery details.

## Production build

```bash
npm run build   # unpacked Linux application directory
npm run dist    # Linux installer/artifact
```

Electron Builder writes output to `dist/`. Native optional SSH acceleration is
not required for packaging; the SSH transport remains available through the
portable `ssh2` runtime.

## Product boundaries

- Local-first operation remains available without cloud credentials.
- External mutations and dangerous commands require an explicit approval.
- Built-in distribution-safe models are clearly identified, while user-selected
  Hugging Face models remain available with their repository metadata and are
  never silently re-licensed or redistributed by SpartanCode.
- Runtime availability is detected honestly; optional model runtimes are never
  reported as ready until their adapter contract is installed and verified.
- Desktop can invoke a configured llama.cpp CLI with validated model and prompt
  arguments; Android-native MLC/PocketPal runtimes remain optional adapters.
- Android release builds include the MIT-licensed `@pocketpalai/llama.rn`
  adapter through Expo prebuild. It activates only in a native binary with a
  compatible local GGUF model; Expo Go and unsupported devices report it as
  unavailable.
- The optional MCP Bridge can validate RS256 OIDC tokens when
  `SPARTANCODE_BRIDGE_OIDC_ISSUER` and
  `SPARTANCODE_BRIDGE_OIDC_AUDIENCE` are configured, deriving least-privilege
  scopes from standard `scope`/`scp` claims.
- Non-loopback MCP Bridge listeners fail closed unless token or complete OIDC
  authentication is configured, and bridge missions use the same approval
  policy as desktop missions. Android bridge mutations and queued operations
  honor the optional biometric gate.
- Remote profiles never persist passwords, private keys, or tokens.
- The renderer does not expose Node.js or filesystem primitives directly.
- Collaboration sessions use versioned, auditable events with conflict
  detection and idempotent merge; authenticated MCP Bridge routes can sync
  participants and events without making the bridge mandatory for Android-only
  local planning.
- Audit exports are bounded, credential-redacted, and SHA-256 verifiable through
  desktop IPC and the authenticated bridge.

## Custom agents

Workspace-scoped Antigravity-compatible agents live under
`.agents/agents/<name>/agent.md`. SpartanCode discovers their YAML frontmatter,
scopes their declared tools and execution policy, and includes the safe public
metadata in mission plans. The repository includes Researcher, Implementer,
Verifier, and Sync Guardian roles. Invalid or oversized definitions are ignored
without blocking application startup.

## Plugins

Workspace plugin metadata may be placed under
`.spartancode/plugins/*.json` or `.spartancode/plugins/<id>/plugin.json`.
SpartanCode validates the ID, semantic version, explicit MIT/Apache-2.0
license, and bounded capability list before exposing metadata through the
isolated API. Discovery never executes plugin code; shell and arbitrary
network capabilities are not accepted by the registry.

A signed HTTPS marketplace index can also be fetched through the isolated API.
It verifies an Ed25519 signature, license, capabilities, source URL, and
artifact SHA-256 metadata. Explicitly selected entries may be downloaded into
a bounded, digest-verified staging cache; staged artifacts are not extracted,
loaded, installed, or executed.

## Execution modes

Desktop settings provide `Guided` and opt-in `YOLO` execution modes. Guided mode
pauses before policy-classified risky missions. YOLO mode is for trusted,
isolated workspaces and proceeds without interactive approval prompts while
recording the mode and policy bypass in the mission activity log. It does not
remove validation, workspace isolation, credential redaction, or audit history.

## Android

The Android companion follows the Android-first phases in the authoritative
[`vibe-coding-export.txt`](vibe-coding-export.txt). The maintained delivery
contract, acceptance criteria, and test matrix are in
[`android/PLAN.md`](android/PLAN.md).

### Verified Android interface

These screenshots were captured by Playwright against the exported Android
companion web surface at a 390×844 device viewport. The smoke test asserted the
command-center shell and queued a mission through the visible controls.

![Android command center](android/screenshots/command-center.png)

![Android mission queued](android/screenshots/mission-queued.png)

The current Android interface description and verification record are in
[`android/ABOUT.md`](android/ABOUT.md).

The evidence-based implementation and release-gate matrix is in
[`docs/ROADMAP_STATUS.md`](docs/ROADMAP_STATUS.md). Product privacy,
biometric, model-license, and release obligations are recorded in
[`docs/COMPLIANCE.md`](docs/COMPLIANCE.md).

Android bundles the same core roles and remains fully usable without the desktop
application, an MCP Bridge, or network access. A bridge is an optional route
for remote execution and synchronization only; local planning, queueing,
policy-visible approvals, and review do not depend on it.

Bridge-secret access on Android can optionally require the device biometric or
passcode prompt. The app receives only the authentication result; it never
stores or processes raw biometric data, and offline missions remain available
when biometric hardware is unavailable.

### Remote planning

Desktop settings provide non-destructive planning tools for DigitalOcean,
Linode, Vultr, Hetzner, and AWS server templates. Estimates show the assumed
hourly rate and exclusions before a server is created. Home-server guidance
covers private Tailscale access, temporary ngrok tunnels, and UPnP forwarding
with explicit exposure warnings. SpartanCode does not create provider
accounts, open router ports, or execute setup scripts without a separate,
user-directed integration.
