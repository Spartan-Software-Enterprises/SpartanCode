# Proton Drive integration

SpartanCode supports Proton Drive as an optional secure backup target for the
desktop workspace. Local encrypted storage remains the primary path; Proton
Drive is never required for Android-only project creation, offline planning, or
release evidence.

## What is integrated

- The official Proton Drive CLI is invoked with fixed, non-shell arguments for
  version checks and scripted uploads.
- A workspace snapshot is encrypted locally with AES-256-GCM before it leaves
  the device. The backup key is generated once and stored in SpartanCode’s
  OS-backed secure vault under `PROTON_DRIVE_BACKUP_KEY`.
- The Proton Drive CLI retains its own browser-authenticated session in the
  operating system secret store. SpartanCode never asks users to paste a
  Proton password or session token into the app.
- Uploads are bounded to 64 MiB, remote paths reject traversal, and workspace
  backup IPC accepts only the selected workspace context.
- Restore downloads into a temporary directory, verifies the authenticated
  AES-256-GCM envelope, and writes only to a new destination inside the
  selected workspace; existing files are never overwritten.

## Setup

1. Install the official Proton Drive CLI for the host platform.
2. Sign in once with `proton-drive auth login`.
3. Set `SPARTANCODE_PROTON_DRIVE_CLI` to the executable path when it is not on
   `PATH`.
4. Open SpartanCode Settings → Proton Drive secure backup and choose a remote
   folder.

The backup action creates an encrypted `*.spartancode.enc` object. Proton Drive
service availability does not affect the local workspace or the local secure
vault.

## Scope and release status

The current integration is an explicit encrypted backup/restore primitive, not
continuous bidirectional synchronization or a Proton Drive file browser.
Conflict-aware synchronization remains separate roadmap work and must preserve
the same local-encryption and user-initiation boundaries.

Proton’s JavaScript Drive SDK is currently a preview intended primarily for
first-party clients, so SpartanCode uses the official CLI boundary until the
SDK is released and its third-party integration contract stabilizes.
