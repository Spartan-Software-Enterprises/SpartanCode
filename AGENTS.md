# SpartanCode continuation guide

This repository is SpartanCode, the local-first AI engineering workspace. Do
not substitute Spartan IDE, gaming, or another project name. Codex and
OpenCode may hand this project back and forth; follow `OPENCODE.md`,
`docs/AGENT_HANDOFF.md`, and `docs/PROJECT_OPERATING_RULES.md` so every
handoff preserves the canonical commit, clean worktrees, test evidence, and
visible beta blockers.

## Source of truth

- GitHub `origin/main` is canonical.
- The local `main` checkout is active development.
- The AWS development checkout is a validation mirror only.
- Follow [docs/SYNC_WORKFLOW.md](docs/SYNC_WORKFLOW.md) before and after every
  change. Never force-push, reset a worktree, or discard divergent changes.
- The active AWS host must come from `SPARTANCODE_REMOTE_HOST`; never assume a
  retired IP address. Use `/data/data/com.termux/files/home/SpartanDev.pem`
  only when that operational key exists and is required.

## Continue the roadmap

1. Read `docs/ROADMAP_MATRIX.md`, `docs/ROADMAP_STATUS.md`, and
   `docs/VERIFICATION_MATRIX.md`.
2. Run `npm run roadmap:audit` and inspect every `Partial` row before choosing
   the next slice.
3. Preserve Android standalone operation: desktop apps, bridges, servers,
   GitHub, and Proton services are optional.
4. Preserve the SpartanCode visual system and update screenshot evidence when
   UI changes.
5. Add automated tests and truthful unavailable/environment states. Do not
   mark physical-device, production operations, legal, or staffing work as
   complete without matching evidence.
6. Run desktop `npm test`, Android `npm run typecheck`, and Android `npm test`.
7. Commit intended work, push `main`, fast-forward AWS, and verify matching
   commit hashes and clean worktrees.

## Security and credential rules

Proton Pass is the preferred primary store for security keys and login
authentication. Use explicit `pass://` references through the official CLI;
never commit passwords, PATs, private keys, vault exports, or runtime secrets.
The OS-backed vault is optional local recovery storage. Proton Drive is an
optional encrypted artifact-storage target, not a credential store. Users need
a Proton account to use Proton Pass or Proton Drive; Android-only workflows do
not require Proton.

## Handoff state

The roadmap is not complete while the matrix contains `Partial` rows. The
current implementation includes bounded continuous Android bridge sync with
conflict review, Proton Pass primary resolution, and Proton Drive encrypted
artifact backup. Continue from the current Git commit and verify actual files;
do not rely on chat history.
