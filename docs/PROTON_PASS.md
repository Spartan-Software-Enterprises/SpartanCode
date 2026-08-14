# Proton Pass integration

SpartanCode treats Proton Pass as the preferred credential system of record.
The OS-backed vault is an optional local recovery/cache layer; it is not a
silent fallback when Proton Pass is unavailable.

## Integrated boundary

- The desktop app can report Proton Pass CLI availability and resolve an
  explicit `pass://vault/item/field` reference through `pass-cli item view`.
- CLI calls use fixed argument arrays, no shell, bounded output, and a timeout.
- Proton Pass passwords, PATs, and returned secret values are never written to
  the workspace, Git, screenshots, audit exports, or project documentation.
- Android-only projects remain independent. Proton Pass mobile export is not
  assumed; Android users can continue creating and releasing projects without
  Proton Pass or the desktop app.

## Setup

1. Create or use a Proton account. A Proton account is required for Proton
   Pass services.
2. Install the official Proton Pass CLI.
3. Sign in with `pass-cli login`.
4. Set `SPARTANCODE_PROTON_PASS_CLI` when the executable is not on `PATH`.
5. Store provider credentials in a dedicated, least-privilege Proton Pass
   vault and reference them with `pass://` URIs in the host integration.
6. For Proton Drive’s artifact-encryption key, set
   `SPARTANCODE_PROTON_DRIVE_BACKUP_KEY_REF` to a Proton Pass reference whose
   value is a 32-byte base64url key.

The settings panel exposes the provider status and a CLI version check. The
local encrypted vault remains available for explicitly chosen recovery storage;
it does not automatically copy Proton Pass records or credentials.

Proton documents the CLI, scoped personal access tokens, and agent tokens as
the supported developer integration surface. SpartanCode does not request a
master password or persist a Proton access token in application data.
