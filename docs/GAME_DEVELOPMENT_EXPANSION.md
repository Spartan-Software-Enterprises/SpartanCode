# SpartanCode future game-development expansion

Status: planning only. No game-development implementation is authorized by
this document.

This is a future expansion of SpartanCode, not a change to its current product
identity. SpartanCode must continue creating and supporting ordinary apps and
programs for Android, iOS, Windows, macOS, Linux, web, servers, and custom
operating-system targets. Game development will be an additive project profile
using the same mobile-first, local-first, optional-remote architecture.

## Product vision

The eventual game workspace should let a user create, edit, preview, test,
package, and release a game from a phone. Desktop, server, GitHub, Codespaces,
and remote build workers are optional accelerators, never prerequisites for
creating or saving a project locally.

A future user should be able to:

- create a blank or template game project from Android;
- describe gameplay goals to Leo and receive a bounded implementation plan;
- edit code, scenes, configuration, dialogue, and assets from mobile;
- preview the game in SpartanCode's built-in browser;
- test touch, keyboard, mouse, controller, orientation, and responsive layouts;
- save, export, restore, and hand off the project without exposing secrets;
- select target platforms independently from the device used for authoring;
- build only where the required toolchain is available; and
- receive honest, target-specific release evidence and limitations.

## Initial scope and non-goals

The first implementation phase should focus on 2D browser games, with Phaser,
TypeScript, and Vite as the default path. It should cover static web releases,
PWA packaging, mobile-first authoring, browser preview, visual testing, and
exportable project archives.

The following are deliberately deferred from the first game release:

- a proprietary game engine;
- full 3D scene editing;
- multiplayer backend infrastructure;
- console SDK integration;
- real-time collaborative game editing;
- automatic publishing to every storefront;
- built-in commercial asset licensing; and
- unreviewed autonomous access to publishing accounts.

Godot, Unity, and Unreal should initially be treated as external-project
workflows: detect their projects, document prerequisites, and orchestrate
bounded commands where supported, without pretending to replace their editors
or native export pipelines.

## Engine and target decision matrix

| Project need | Default path | Alternatives or boundary |
| --- | --- | --- |
| 2D sprites, tilemaps, platformers, top-down, arcade, tactics | Phaser + TypeScript + Vite | PixiJS or external-engine orchestration |
| Direct 3D in a plain TypeScript app | Three.js + Vite | Babylon.js or PlayCanvas evaluation |
| 3D inside a React-first application | React Three Fiber | Vanilla Three.js |
| Shader-first rendering research | Raw WebGL/WebGPU | Custom Three.js renderer |
| Existing Godot, Unity, or Unreal project | External project adapter | Official engine toolchain remains authoritative |

Phaser is the default 2D path. Three.js or React Three Fiber should be chosen
only when the project explicitly needs 3D. Engine adapters must report their
supported host systems, target platforms, SDKs, licenses, headless-build
support, automated-test support, and hardware requirements.

Initial target profiles:

- web desktop;
- web mobile;
- Progressive Web App;
- Android package or wrapper;
- Windows desktop;
- macOS desktop;
- Linux desktop;
- server-hosted browser game;
- iOS where the required macOS/Xcode environment is available; and
- custom targets through declared user build commands.

Authoring device and release target are independent. A phone-only user may
create a Windows or Linux project; a later build worker may be required to
compile it. Unsupported targets must be shown as unavailable rather than
silently skipped or represented as verified.

## Proposed project contract

Generated game projects should use a stable structure similar to:

```text
game-project/
├── .devcontainer/
├── .spartancode/
│   ├── game-project.json
│   ├── asset-manifest.json
│   ├── input-map.json
│   ├── build-profiles.json
│   ├── test-policy.json
│   └── release-policy.json
├── src/
│   ├── game/simulation/
│   ├── game/content/
│   ├── render/scenes/
│   ├── render/adapters/
│   ├── input/
│   ├── ui/
│   ├── audio/
│   ├── save/
│   └── platform/
├── assets/
│   ├── characters/
│   ├── environments/
│   ├── tiles/
│   ├── ui/
│   ├── audio/
│   └── effects/
├── tests/
│   ├── simulation/
│   ├── integration/
│   ├── visual/
│   └── fixtures/
├── scripts/
├── package.json
└── README.md
```

The project manifest should declare engine and version, target platforms,
required SDKs, build profiles, asset licenses, network modes, plugin hashes,
test suites, telemetry choices, privacy settings, and release restrictions.

## Architecture boundaries

Simulation is authoritative and renderer-independent. It owns entities, rules,
progression, timers, collisions, AI decisions, inventory, deterministic seeds,
checkpoints, and saveable state. Rendering owns scenes, sprites, meshes,
animation playback, cameras, particles, interpolation, and renderer lifecycle.
UI owns menus, HUD, settings, dialogue, accessibility, input rebinding, and
save selection. Physics is an explicit adapter that returns bounded contact
events to the simulation.

All physical controls map to named actions before reaching gameplay or UI:

```text
keyboard / touch / mouse / gamepad / accessibility switch
        → device adapter → named action → simulation or UI command
```

Required input behavior includes rebindable actions, device profiles, virtual
touch controls, gamepad mapping, keyboard navigation, focus-visible behavior,
dead zones, sensitivity settings, and clear input capture when menus or text
fields are active.

Save files contain versioned serializable simulation state only. They must not
serialize engine scenes, renderer objects, DOM nodes, WebAudio nodes, physics
internals, or platform handles. Replay debugging should record deterministic
seeds and commands rather than screenshots or renderer state.

## Mobile-only authoring workflow

Project creation should expose genre, orientation, target platforms, input
modes, art direction, resolution/scaling, offline mode, and optional remote
build destination. Initial templates should include platformer, top-down,
twin-stick/action, arcade shooter, puzzle/grid, turn-based tactics,
visual-novel/dialogue, and blank Phaser projects.

Mobile surfaces should eventually include file/project navigation, a mobile
code editor, scene/entity inspection, JSON/configuration editing, asset import
and preview, prompt-driven changes, undo/redo, local autosave, preview/build
controls, logs, test results, and touch-friendly game testing.

The phone-only path must cover touch controls, orientation, safe areas,
viewport scaling, constrained performance, audio interruption,
background/foreground transitions, offline behavior, and installable PWA
behavior. Keyboard, mouse, controller, and larger-screen testing may use an
optional desktop or remote environment.

## Agent model

Leo remains the commander and owns sequencing, conflict resolution, and final
readiness. Future bounded specialist roles are:

| Role | Responsibility |
| --- | --- |
| Game Designer | Fantasy, core loop, progression, difficulty, failure states |
| Game Architect | Project schema, engine/target adapters, boundaries |
| Phaser Specialist | Scenes, entities, input, physics, runtime integration |
| 3D Specialist | Three.js/R3F scene and asset integration when selected |
| Simulation Engineer | Deterministic rules, saves, replay, migration |
| UI/UX Agent | HUD, menus, touch controls, accessibility |
| Technical Artist | Sprites, atlases, tilemaps, animation metadata, optimization |
| Audio Agent | Music, effects, mixing, captions, focus behavior |
| Build Agent | Web, PWA, Android, desktop, and target packaging |
| QA Agent | Unit, integration, device, browser, and visual tests |
| Performance Agent | Frame time, memory, asset size, battery, startup |
| Security/License Agent | Plugin, asset, license, privacy, and supply-chain review |
| Release Agent | Versioning, manifests, checksums, signing, release evidence |
| Documentation Agent | Tutorials, controls, attribution, troubleshooting |

Every agent receives a bounded task and acceptance criteria. Agents must use
Plan → Build → Verify, record changed files and tests, stay inside the target
declaration, and never publish externally without an explicit release action.
Codex and OpenCode use the same handoff and operating rules.

## Assets, audio, and content provenance

Game code references stable asset-manifest keys rather than raw filenames.
Each asset records logical ID, source, type, dimensions, animation metadata,
license/attribution, generated variants, and content hash. The initial 2D
pipeline should support PNG, SVG, WebP, audio, sprite sheets, tilemaps,
animation previews, duplicate/unused detection, and target-specific
compression. Future 3D delivery defaults to GLB/glTF 2.0 with explicit LOD,
mesh compression, texture compression, and collision-proxy metadata.

Audio should use data-driven music, ambience, effects, and voice buses with
mute/volume controls, mobile focus handling, browser unlock behavior,
captions, graceful unavailable states, and test-safe playback defaults.

Imported scripts and plugins are untrusted. Archives require traversal,
symlink, decompression-bomb, oversized-file, and executable-payload checks.
Executable plugins require signatures, hashes, declared capabilities, isolated
runtime permissions, revocation/quarantine support, and repeated integrity
checks at install, update, build, and release. Generated content is labeled so
the user can review or remove it.

The license ledger covers engines, SDKs, runtimes, plugins, fonts, audio,
sprites, textures, models, AI-assisted content, marketplace items, and server
dependencies. Release should fail for unknown licenses, missing attribution,
non-redistributable assets, or incompatible plugin/model terms.

## Dev Containers and build profiles

Future game-specific Dev Container presets should extend SpartanCode's current
user-project generator with profiles such as `game-2d-phaser`, `game-3d-three`,
`game-3d-react-three-fiber`, `game-web-full`, `game-mobile-android`, and
`game-cross-platform`. Containers remain optional and must not be required for
Android-only authoring.

Common optional capabilities include Node LTS, TypeScript/Vite, Playwright,
Chromium, image/audio inspection, Git LFS guidance, Android SDK/emulator,
Blender CLI, FFmpeg, Xvfb, non-root development, forwarded preview ports, and
lockfile-based installation. Credentials must never be baked into images.

Build profiles should declare target OS/architecture, required toolchain,
environment inputs, input directories, output patterns, signing requirements,
verification commands, unsupported-host behavior, and reproducibility metadata.
Initial profiles are `web`, `web-pwa`, `desktop-windows`, `desktop-macos`,
`desktop-linux`, `android`, `ios`, and `custom`.

## Preview, testing, and release evidence

The built-in browser should eventually provide live reload where safe, logs,
device viewports, touch/orientation simulation, network throttling, offline
mode, FPS/memory indicators, pause/resume, screenshots, reproducible URLs, and
source-linked error overlays. It must distinguish development-server,
game-runtime, asset-loading, build, and browser-compatibility failures.

Required test layers:

1. deterministic simulation unit tests;
2. scene, asset, save/load, pause, and audio integration tests;
3. browser launch and interaction smoke tests;
4. Playwright visual tests for menus, HUD, gameplay, touch layout,
   orientation, loading, error, victory, and failure states;
5. performance smoke tests for startup, frame time, memory, and asset loads;
6. package smoke tests for each advertised target;
7. accessibility tests for keyboard, labels, motion, contrast, and focus; and
8. adversarial networking tests when networking is explicitly enabled.

Visual evidence should record commit, browser/version, viewport, device-pixel
ratio, test seed, screenshot hashes, and sanitized console output. Emulator
results must not be represented as proof of biometric, camera, GPU-driver,
thermal, AR/VR, or real-network behavior. Physical-device evidence remains
required where the target or feature needs it.

A release gate requires source integrity, reproducible builds, target
compilation, automated tests, reviewed visual evidence, device evidence,
performance thresholds, plugin safety, licensing, privacy, security,
packaging, rollback, and beta-owner signoff. `SKIP` is not a pass: it must be
classified as not applicable with justification or as a release blocker.

Telemetry is opt-in or legally justified, disabled by default for local/offline
projects, and independently configurable. It must not collect source code,
project files, credentials, location, contacts, microphone/camera data,
biometrics, keystrokes, or full network payloads by default. Consent, deletion,
retention, export, redaction, and regional privacy notices are required before
public release.

## Phased future roadmap

### Phase 0 — Architecture contract

Approve the game-project schema, engine/target matrix, simulation/render/input/
save boundaries, asset manifest, build profiles, threat model, license ledger,
privacy model, and test taxonomy. No implementation begins before this phase is
approved.

### Phase 1 — 2D foundation

Define the Phaser template, action map, scene lifecycle, simulation/render
separation, asset manifest, DOM HUD/menu shell, save schema, and Dev Container
preset. Exit when a blank project boots on desktop and mobile browsers.

### Phase 2 — Mobile authoring

Add game templates, mobile project creation, touch-oriented editing, asset
preview/import, autosave/recovery, prompt-to-change workflow, local preview,
and export. Exit when a phone-only user can create, edit, save, preview, and
export a small game.

### Phase 3 — Core 2D tooling

Add sprite/animation, tilemap, scene/entity inspection, audio, effects, and
reusable gameplay systems. Exit when representative platformer and top-down
templates can be meaningfully customized.

### Phase 4 — Quality foundation

Add test templates, Playwright visual baselines, mobile viewport coverage,
runtime diagnostics, performance budgets, bundle-size checks, and screenshot
evidence. Exit when release readiness requires defined validation gates.

### Phase 5 — Web/PWA and packaging

Add reproducible web/PWA builds, project archive export/restore, manifests,
checksums, optional remote build workers, Android wrapper evaluation, and
desktop wrapper evaluation. Exit when a phone-only user can produce a versioned
deployable web release.

### Phase 6 — Native and advanced targets

Validate Android, desktop, and optional iOS adapters with target-specific
signing and capability checks. Later evaluate Three.js, React Three Fiber,
external-engine orchestration, multiplayer, advanced assets, AR/VR, and mature
plugin/content ecosystems.

## Decision gates before implementation

Future product approval must separately decide:

1. browser/PWA only versus Android packaging in the first game beta;
2. framework-light Phaser UI versus React-hosted UI;
3. user-owned, Spartan-managed, or hybrid remote build workers;
4. whether multiplayer is a separate product phase;
5. permitted asset-generation providers and licenses; and
6. whether publishing integrations are in beta or deferred.

## Planning boundary

This document records the future expansion only. It does not change the active
SpartanCode implementation roadmap, add game dependencies, create game
templates, provision game infrastructure, or authorize publishing. A future
implementation request must begin with Phase 0 approval and a new scoped plan.
