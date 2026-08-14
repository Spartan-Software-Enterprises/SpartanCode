# User-project Dev Containers

SpartanCode supports project-local Dev Container generation for desktop users.
The generated definition is written inside the selected workspace and can be
opened by VS Code, GitHub Codespaces, or another Dev Container-compatible
client.

The desktop IPC surface exposes `generateDevContainer(projectPath, options)`.
Supported presets are `node`, `python`, `android`, and `universal`; every
preset uses a published Microsoft Dev Container image, bounded forwarded ports,
and a small reviewed extension list. The generator refuses paths outside the
approved workspace and refuses to overwrite an existing definition unless the
caller explicitly supplies `overwrite: true`.

This creates the development environment only. It does not upload user code,
create a billable Codespace, install a bridge, or store credentials. Codespaces
still requires the user's separate GitHub authorization and cost review.

Dev Containers are an optional build workspace, not a target restriction:
SpartanCode projects can target Android, iOS, Windows, macOS, Linux, web, or a
custom device/operating system. The selected target's compiler and signing
requirements remain explicit release-evidence gates.
