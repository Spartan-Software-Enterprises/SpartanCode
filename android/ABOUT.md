# SpartanCode

## A focused AI engineering workspace—in your pocket or on your desk

SpartanCode turns software ideas into visible, reviewable progress. It is a
local-first command center for missions, agent teams, artifacts, approvals,
and verification, wrapped in a distinctive dark Spartan IDE theme designed to
keep attention on the work.

### Built for the way real projects move

- **Start with an outcome.** Queue a mission from the desktop or Android app,
  even when offline.
- **Let the team work in stages.** Research, implementation, verification,
  and synchronization are represented as inspectable agent roles.
- **Review what was produced.** Artifacts, activity, approvals, and audit
  history make progress easy to understand before anything risky is applied.
- **Stay independent.** Android works without a desktop installation, MCP
  Bridge, cloud credentials, or network access for core planning and review.
- **Extend when you choose.** Optional local models, remote connections,
  plugins, and bridges add capability without becoming a prerequisite.

## Interface gallery

The following gallery shows every primary desktop menu and the assistant
surface while preserving the Spartan IDE color system.

![Command center](../docs/assets/desktop-menu-gallery/desktop-home.png)

![Projects](../docs/assets/desktop-menu-gallery/desktop-projects.png)

![Agent manager](../docs/assets/desktop-menu-gallery/desktop-agents.png)

![Artifact review](../docs/assets/desktop-menu-gallery/desktop-artifacts.png)

![Workspace settings](../docs/assets/desktop-menu-gallery/desktop-settings.png)

![Settings governance and extensibility](../docs/assets/desktop-menu-gallery/desktop-settings-governance.png)

![Spartan assistant](../docs/assets/desktop-menu-gallery/desktop-menu-assistant.png)

![Mission composer](../docs/assets/desktop-menu-gallery/desktop-composer-filled.png)

## Android command center

The Android companion keeps high-value controls reachable on a phone:

- local and synced status with offline mission queueing;
- voice dictation when the native recognizer is available;
- optional bridge profiles with secure token storage;
- local collaboration sessions and approval gestures;
- model, storage, biometric, and runtime readiness diagnostics;
- persisted app settings for guided/YOLO execution preference, local model
  quantization, voice input, and automatic sync on resume;
- workspace-safe bridge token cleanup, connection controls, remote planning,
  router guidance, and offline audit visibility;
- app-private local project state with Android Keystore-backed bridge secrets;
- artifact and approval review without requiring the desktop app.

![Android command center](../android/screenshots/command-center.png)

![Android mission queued](../android/screenshots/mission-queued.png)

The companion is standalone-first. A bridge is an optional route for remote
execution and synchronization only; it is never required for local missions,
bundled agent roles, queueing, or review.

## Trust and transparency

SpartanCode keeps risky actions policy-visible, records execution mode and
activity, restricts local workspace access, redacts credentials from remote
profiles and audit exports, and exposes only explicitly licensed model
metadata. YOLO mode is available for trusted isolated workspaces, but it does
not remove validation, isolation, credential redaction, or audit history.

For the maintained delivery contract and engineering records, see
[`PLAN.md`](PLAN.md), [`docs/ROADMAP_STATUS.md`](../docs/ROADMAP_STATUS.md),
and [`docs/VERIFICATION_MATRIX.md`](../docs/VERIFICATION_MATRIX.md).
