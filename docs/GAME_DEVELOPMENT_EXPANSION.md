# SpartanCode future game-development expansion

Status: planning only. No game-development implementation is authorized by
this document.

This is a future expansion of SpartanCode, not a change to its current product
identity. SpartanCode must continue creating and supporting ordinary apps and
programs for Android, iOS, Windows, macOS, Linux, web, servers, and custom
operating-system targets. Game development will be an additive project profile
using a native-production-first, multi-surface architecture with local and
optional remote execution. The expansion is a front end and orchestration
layer for the game-development ecosystem: it should integrate major game
engines and creation tools rather
than replace them, with serious native-engine support for high-end PC and
console production.

## Product vision

The eventual game workspace should let a user create, edit, preview, test,
package, and release a premium game through a workstation, build server, or
authorized devkit workflow. Desktop and server tooling are primary production
surfaces. GitHub, Codespaces,
and remote build workers are integrated production backends where appropriate.

A future user should be able to:

- create a blank or template game project from the desktop or another supported
  front end;
- describe gameplay goals to Leo and receive a bounded implementation plan;
- edit code, scenes, configuration, dialogue, and assets from the integrated
  desktop/workstation front end;
- preview the game in SpartanCode's built-in browser;
- test touch, keyboard, mouse, controller, orientation, and responsive layouts;
- save, export, restore, and hand off the project without exposing secrets;
- select target platforms independently from the device used for authoring;
- build only where the required toolchain is available; and
- receive honest, target-specific release evidence and limitations.

SpartanCode is the user's game-production command center. A project may use
one engine or a coordinated toolchain of engines, DCC tools, asset tools,
audio tools, middleware, build systems, source-control services, and platform
SDKs. SpartanCode should present their project state and workflows through one
consistent front end while preserving each tool's official project format,
editor, build pipeline, licensing, and platform authority.

## Initial scope and non-goals

The game expansion targets premium, high-fidelity PC production first,
followed by authorized console production. Low-end game production is outside
this expansion's quality target.
Browser/2D tooling may be used only as an optional planning, simulation, UI,
or rapid-validation surface; it is not the definition of the game product,
its quality bar, or its release target. The roadmap must build toward native
engine adapters, remote build infrastructure, target-specific SDK/toolchain
handling, devkit workflows, performance profiling, asset pipelines, and
platform certification evidence.

The following are deliberately deferred from the first game release:

- a proprietary game engine;
- full 3D scene editing;
- multiplayer backend infrastructure;
- console SDK integration before the required platform access, agreements,
  devkits, and official toolchains are available;
- real-time collaborative game editing;
- automatic publishing to every storefront;
- built-in commercial asset licensing; and
- unreviewed autonomous access to publishing accounts.

Godot, Unity, and Unreal should initially be treated as external-project
workflows: detect their projects, document prerequisites, and orchestrate
bounded commands where supported, without pretending to replace their editors
or native export pipelines. They are nevertheless strategic supported-engine
paths for the eventual high-end PC and console expansion, subject to the
engine's license, platform agreements, SDK access, developer hardware, and
certification rules.

## Engine and target decision matrix

| Project need | Default path | Alternatives or boundary |
| --- | --- | --- |
| Optional 2D planning, simulation, or UI validation | Phaser + TypeScript + Vite | PixiJS or external-engine orchestration; never the premium release target |
| Direct 3D in a plain TypeScript app | Three.js + Vite | Babylon.js or PlayCanvas evaluation |
| 3D inside a React-first application | React Three Fiber | Vanilla Three.js |
| Shader-first rendering research | Raw WebGL/WebGPU | Custom Three.js renderer |
| Existing Godot, Unity, or Unreal project | External project adapter | Official engine toolchain remains authoritative |

Phaser is only an optional browser validation path. Premium game projects
should select an approved native-capable engine and target profile from the
start; Three.js or React Three Fiber are browser 3D options, not substitutes
for a native PC/console production pipeline. Engine adapters must report their
supported host systems, target platforms, SDKs, licenses, headless-build
support, automated-test support, and hardware requirements.

Primary target profiles, in order of delivery:

- high-fidelity Windows PC releases;
- high-fidelity macOS and Linux PC releases;
- authorized console development and release targets after the PC track;
- custom native targets through declared engine/toolchain adapters; and
- dedicated build, profiling, and certification profiles for each target.

Optional supporting surfaces—not the game quality target—include:

- desktop browser previews;
- Progressive Web App previews;
- optional project review and monitoring surfaces; and
- server-hosted previews.

The premium PC-first production track targets:

- Windows, macOS, and Linux PC releases with high-fidelity rendering;
- later console development and export paths where the user has authorized
  platform access, SDKs, devkits, and the selected engine supports the target;
- performance-oriented builds with GPU profiling, memory budgets, streaming,
  shader compilation, LOD, asset cooking, crash diagnostics, and platform
  input; and
- certification-ready packaging, submission preparation, rollback artifacts,
  and platform-specific compliance evidence.

SpartanCode will not claim console support merely because a project can export
to a generic desktop binary. Each console target requires its own capability
declaration, authorized SDK/toolchain, devkit or approved test environment,
platform security rules, and certification checklist.

Authoring surface and release target are independent. Premium target builds
require the appropriate workstation, build worker, SDK, devkit, and engine
toolchain. Unsupported targets must be shown as unavailable rather than
silently skipped or represented as verified.

## Unified engine and creation-tool front end

SpartanCode is the control plane for the entire game-production toolchain. It
must not become a single-engine editor or assume that one engine can satisfy
every project. A project may combine an engine, DCC tools, material and audio
tools, middleware, source control, build workers, QA systems, and platform
services. The front end presents one project graph, capability report, task
queue, log surface, artifact history, and release workflow while each vendor's
tool remains authoritative for its native data and export rules.

Initial major engine adapters:

| Engine | Native project surface | Orchestration surface | Strategic role |
| --- | --- | --- | --- |
| Unreal Engine | `.uproject`, Config, Content, Source, Plugins | UnrealBuildTool, commandlets, AutomationTool/UAT, `BuildCookRun`, BuildGraph, Project Launcher | First high-end PC adapter and leading PC/console path |
| Unity | `Assets`, `Packages`, `ProjectSettings`, Editor scripts | Batch mode, `-executeMethod`, BuildPipeline, Build Profiles, Build Automation | Broad commercial alternative with strong editor automation |
| O3DE | `project.json`, Gems, CMake, Assets | `o3de` CLI, CMake, AssetProcessorBatch, AssetBundlerBatch | Open-source, modular high-end alternative |
| Godot | `project.godot`, scenes, resources, scripts | Headless editor, export presets, `--export-release`, editor scripts | Open and scriptable PC integration; console requires a separate porting path |
| CRYENGINE | `.cryproject`, Assets, Code, plugins | CMake, Resource Compiler, Job XML, packaging scripts | High-fidelity existing-project integration with more version-specific work |
| GameMaker and other engines | Vendor project/resource formats | Vendor compiler or project-owned build wrappers | Additional engine adapters; not the high-end PC foundation |

This is an expandable adapter family, not a limit on supported engines. The
same contract must accept future proprietary, open-source, and specialist
engines without changing the SpartanCode front end.

Major creation-tool adapters must cover Blender, Maya, 3ds Max, Houdini,
Substance, photogrammetry tools, FMOD, Wwise, localization tools, Git/Git LFS,
Perforce, CI runners, QA systems, and artifact stores. DCC adapters own
discovery, version/license checks, approved scripts or batch jobs, export,
validation, optimization, cancellation, logs, hashes, and provenance. They do
not attempt to recreate every proprietary scene, rig, simulation, shader, or
binary asset format.

The common asset flow is:

```text
source asset
  -> DCC/tool preflight
  -> approved export/interchange
  -> geometry/material/texture/audio validation
  -> optimization and LOD generation
  -> engine import
  -> engine-owned cook/chunk/package
  -> immutable release artifact
```

USD is preferred for layered scene composition where supported; FBX remains a
useful animation/geometry interchange; glTF/GLB is a runtime-oriented option;
engine-native assets remain authoritative for final production. Every
conversion records tool versions, settings, source hashes, generated hashes,
coordinate and color conventions, and known loss or unsupported features.

## High-end PC production gates

High-end PC support means more than producing a desktop executable. Before a
build or performance claim, the adapter must detect the OS, architecture, GPU
vendor/device/driver, D3D12/Vulkan/Metal features, shader model, ray tracing,
mesh shaders, VRS, sampler feedback, local/shared memory budgets, display/HDR
state, input devices, accessibility context, compiler, SDK, profilers, and
symbol tools.

PC validation must capture cold boot, first playable frame, shader-heavy and
worst-case scenes, loading/traversal, and representative gameplay traces. The
evidence includes frame-time percentiles, long frames, CPU/GPU queue timing,
shader compilation/cache hits and stalls, streaming and memory peaks,
HDR/SDR behavior, input/rebinding/hot-plug behavior, accessibility, and crash
diagnostics.

The first-class profiles are D3D12 production/validation, Vulkan
production/validation, and Metal where macOS is a target. Optional vendor
profiles may use PIX, NVIDIA Nsight/Aftermath, AMD Radeon GPU Profiler/Memory
Visualizer/GPU Detective, and equivalent tools when installed. Shader caches
are keyed by API, GPU, driver, engine/build, compiler, and configuration.
Crash bundles retain matching symbols, shader debug data, device/driver
identity, API diagnostics, logs, memory state, and artifact digest.

## Engine-neutral build and release contract

Every build request binds an immutable source revision, exact engine and
adapter versions, target, build definition, runner class, SDK/toolchain
constraints, cache policy, and release intent. Every result records artifact
and manifest digests, engine/compiler/SDK/plugin versions, runner identity,
resolved dependencies, raw and normalized logs, tests, performance reports,
symbols, provenance, signatures, external gates, and rollback references.

The standard graph is:

```text
source-resolve -> environment-verify -> compile -> import/cook
  -> package -> symbols/provenance -> automated-tests -> smoke-test
  -> platform-validation -> external-certification -> release-promotion
```

Promotion selects an existing immutable artifact; it never rebuilds a moving
branch. Console and signing runners are isolated and never receive untrusted
fork code. The states are `blocked`, `waiting_external_gate`, `failed`,
`succeeded`, `eligible`, `released`, and `rollback_available`; a successful
PC build is never silently promoted to a console or certification claim.

## Console integration boundary

Console production is an adapter over authorized platform programs, not a
feature SpartanCode can grant by itself. Each target requires developer
registration, agreements/NDA, confidential SDK/toolchain, authorized devkit or
approved test environment, platform package/signing/encryption tools,
physical validation, and certification evidence. PlayStation, Xbox, and
Nintendo access is account- and partner-controlled. Xbox publicly documents
XVC packaging, validation/submission, sandboxes, and GDK access gates; Unreal
documents console support and its source-build requirement; Unity requires
eligible licensing and platform access; Godot relies on third-party or private
ports.

SpartanCode may invoke tools present in an authorized environment, but it may
not acquire, redistribute, or bypass confidential SDKs, devkit access,
platform signing material, or certification controls. The UI must say
“console build blocked: SDK unavailable,” “devkit deployment unavailable,” or
“certification not performed” when those gates are missing.

## Primary research sources

- [Unreal build operations](https://dev.epicgames.com/documentation/en-us/unreal-engine/build-operations-cooking-packaging-deploying-and-running-projects-in-unreal-engine), [Automation Tool](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-automation-tool-overview-for-unreal-engine), and [BuildGraph](https://dev.epicgames.com/documentation/unreal-engine/buildgraph-for-unreal-engine?lang=en-US)
- [Unity command-line builds](https://docs.unity3d.com/Manual/build-command-line.html) and [Build Automation](https://docs.unity.com/en-us/build-automation)
- [Godot command-line export](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html) and [console support](https://godotengine.org/consoles/)
- [O3DE CLI](https://docs.o3de.org/docs/user-guide/project-config/cli-reference/)
- [Xbox onboarding and packaging](https://learn.microsoft.com/en-us/gaming/game-publishing/onboarding/overview), [Nintendo developer process](https://developer.nintendo.com/the-process), and [PlayStation registration](https://register.playstation.net/)
- [D3D12 feature queries](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ne-d3d12-d3d12_feature), [D3D12 memory](https://learn.microsoft.com/en-us/windows/win32/direct3d12/memory-management-strategies), [Vulkan features](https://docs.vulkan.org/spec/latest/chapters/features.html), and [PIX](https://learn.microsoft.com/en-us/windows/win32/direct3dtools/pix/articles/general/pix-overview)
- [OpenUSD](https://openusd.org/release/), [Khronos glTF](https://registry.khronos.org/glTF/), [Houdini PDG/TOPs](https://www.sidefx.com/docs/houdini/tops/), and [Git LFS](https://git-lfs.com/)

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

## Workstation-first production workflow

Project creation should expose genre, orientation, target platforms, input
modes, art direction, resolution/scaling, offline mode, and optional remote
build destination. The primary surface is a desktop/workstation project hub
with engine/editor launch, scene and asset handoff, project-owned automation,
logs, profiling, build graphs, test results, and release evidence. Initial
templates must be engine- and target-aware rather than tied to a browser
runtime.

The front end must support high-end PC workflows: source and asset navigation,
engine-specific project inspection, configuration editing, approved editor
scripts, DCC export jobs, dependency graphs, local and remote builds,
performance captures, crash/symbol review, collaboration, and immutable
artifact promotion. Any companion client is optional and cannot be the
acceptance environment for premium PC quality gates.

## Agent model

Leo remains the commander and owns sequencing, conflict resolution, and final
readiness. Future bounded specialist roles are:

| Role | Responsibility |
| --- | --- |
| Game Designer | Fantasy, core loop, progression, difficulty, failure states |
| Game Architect | Project schema, engine/target adapters, boundaries |
| Engine Adapter Specialists | Unreal, Unity, O3DE, Godot, CRYENGINE, GameMaker, and future engines |
| DCC/Tools Integration Agent | Blender, Maya, 3ds Max, Houdini, Substance, audio, and middleware workflows |
| 3D/Rendering Specialist | Native engine rendering, shaders, materials, lighting, profiling, and asset integration |
| Simulation Engineer | Deterministic rules, saves, replay, migration |
| UI/UX Agent | Front-end project hub, editor integration, menus, input, accessibility |
| Technical Artist | Models, materials, animation, LODs, shader metadata, optimization |
| Audio Agent | Music, effects, mixing, captions, focus behavior |
| Build Agent | PC, authorized console, engine, DCC, and target packaging |
| QA Agent | Engine, integration, hardware, visual, performance, and certification tests |
| Performance Agent | Frame time, GPU, memory, streaming, shader, asset, and startup budgets |
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
mute/volume controls, focus handling, browser unlock behavior,
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
user-project generator with profiles such as `game-unreal-pc`, `game-unity-pc`,
`game-o3de-pc`, `game-godot-pc`, `game-cryengine-pc`,
`game-dcc-pipeline`, `game-audio-middleware`, `game-console-authorized`, and
`game-cross-engine`. Containers remain optional; licensed engines, DCCs, SDKs,
devkits, and vendor tools remain authoritative and may require controlled
native hosts.

Common optional capabilities include engine CLIs, vendor editor scripting,
GPU profilers, DCC batch tools, Playwright for the front end, image/audio
inspection, Git LFS/Perforce guidance, Blender/Houdini/Substance tooling,
FFmpeg, non-root development, forwarded preview ports, and lockfile-based
installation. Credentials must never be baked into images.

Build profiles should declare target OS/architecture, required toolchain,
environment inputs, input directories, output patterns, signing requirements,
verification commands, unsupported-host behavior, and reproducibility metadata.
Initial profiles are `pc-windows-high-fidelity`, `pc-linux-high-fidelity`,
`pc-macos-high-fidelity`, `engine-custom`, `console-authorized`,
`dcc-pipeline`, and `custom`.

## Preview, testing, and release evidence

The built-in preview surface should eventually provide engine/project launch,
logs, performance indicators, pause/resume, screenshots, reproducible preview
references, and source-linked error overlays. Browser previews may support
web-target projects, but they are not the quality gate for native high-end PC
games. The front end must distinguish editor, game-runtime, asset-loading,
build, platform, and hardware failures.

Required test layers:

1. deterministic simulation unit tests;
2. scene, asset, save/load, pause, and audio integration tests;
3. browser launch and interaction smoke tests;
4. Playwright visual tests for the SpartanCode front end, project hub, engine
   integration surfaces, loading, error, and release states;
5. native runtime and hardware performance tests for startup, frame time,
   memory, shaders, streaming, input, and asset loads;
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

### Phase 1 — Premium production foundation

Define the native-engine/project adapter contract, action map, scene and
simulation boundaries, asset manifest, save schema, build profiles, hardware
requirements, and Dev Container preset. Optional browser/2D validation is
allowed for early feedback, but the exit criterion is a truthful premium
target capability report—not a blank browser game.

### Phase 2 — Multi-surface front end

Add game templates and desktop project creation,
asset preview/import, autosave/recovery, prompt-to-change workflow, local
preview, and export. Exit when the front end can create, edit, save, preview,
and hand off a serious premium PC project for an authorized native build; a
small browser game is not an acceptance target.

### Phase 3 — Core production tooling

Add scene/entity inspection, animation, audio, effects, asset import/cooking,
profiling hooks, and reusable gameplay systems. Optional 2D templates may
support planning only; they do not define acceptance. Exit when a premium
engine project can be meaningfully customized with target-aware diagnostics.

### Phase 4 — Quality foundation

Add test templates, Playwright visual baselines, target-profile coverage,
runtime diagnostics, performance budgets, asset-size checks, and screenshot
evidence. Exit when release readiness requires defined validation gates.

### Phase 5 — Premium PC packaging and evidence

Add reproducible project builds, archive export/restore, manifests, checksums,
remote build workers, native desktop packaging, and target-specific release
evidence. Browser previews remain optional support surfaces. Exit when a
workstation or authorized build worker can
produce a versioned high-end PC target release with the front end recording
complete evidence.

### Phase 6 — Premium PC production

Validate native PC adapters with target-specific signing and capability checks.
Establish the high-end PC production track with native-engine adapters,
GPU/performance profiling, large-world asset cooking, shader/LOD workflows,
and crash diagnostics. After the PC production gates pass, evaluate console
adapters through authorized
SDK/devkit environments, certification evidence, and engine-specific
packaging. Browser previews, multiplayer, advanced assets,
AR/VR, and mature plugin/content ecosystems are supporting or subsequent
capability tracks, never replacements for the premium PC/console objective.

### Phase 7 — Console expansion after PC release

This phase begins only after the premium PC production track is validated. It
extends the front end to console production around engines capable of shipping
high-end PC and console games, with authorized build infrastructure as the
production surface.

Deliverables:

- front-end adapters for approved native engines and creation-tool workflows;
- PC graphics capability detection, profiling, shader/build caching, asset
  cooking, streaming, memory budgets, and crash diagnostics;
- console target manifests, SDK/toolchain checks, devkit connectivity where
  authorized, packaging/signing boundaries, and certification checklists;
- remote build workers for toolchains unavailable on the active workstation;
- deterministic build evidence, symbol/archive handling, test reports, and
  target-specific release artifacts; and
- a clear split between the SpartanCode front end and privileged native/console
  compilation or publishing on authorized infrastructure.

Exit criteria:

- A project can declare a high-end PC or console target and receive a truthful
  capability report before work begins.
- The selected engine can be built through its official supported pipeline in
  an authorized environment.
- Performance, packaging, device, security, licensing, and certification gates
  are evidenced separately for each advertised target.
- Missing SDKs, devkits, licenses, or platform approvals produce explicit
  blockers rather than a falsely successful build.

## Decision gates before implementation

Future product approval must separately decide:

1. which approved native engine(s) and premium PC target families are in the
   first game beta; console targets are explicitly deferred to a later gate;
2. whether browser/2D validation is included as an optional support surface;
3. user-owned, Spartan-managed, or hybrid remote build workers;
4. whether multiplayer is a separate product phase;
5. permitted asset-generation providers and licenses; and
6. whether publishing integrations are in beta or deferred.

## Planning boundary

This document records the future expansion only. It does not change the active
SpartanCode implementation roadmap, add game dependencies, create game
templates, provision game infrastructure, or authorize publishing. A future
implementation request must begin with Phase 0 approval and a new scoped plan.
