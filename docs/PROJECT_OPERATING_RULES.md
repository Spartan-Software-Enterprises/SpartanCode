# SpartanCode operating rules and priorities

This is the handoff reference for Codex, OpenCode, and delegated agents. These
rules describe the project decisions already established by the owner and the
repository's source-control safeguards.

## Priority order

1. Preserve work and credentials.
2. Keep `origin/main` as the canonical SpartanCode source of truth.
3. Meet the September 1, 2026 beta gates with truthful evidence.
4. Keep Android standalone and capable of creating target-independent,
   release-plannable projects from a phone alone.
5. Advance the roadmap in parallel with disjoint agent scopes.
6. Improve features and presentation without overstating unavailable,
   physical, legal, store, or governance capabilities.

## Product direction

- The project is **SpartanCode**, not Spartan IDE or Spartan Gaming.
- Leo is the default agent and commander of the agent personas.
- The Spartan IDE visual aesthetic, company-approved logo, colors, screenshots,
  and menus are the presentation standard. Refresh screenshot evidence when a
  user-facing surface changes.
- Android must work without the desktop app, a bridge, a server, GitHub, AWS,
  or Proton. Remote integrations are optional accelerators.
- A phone-only user can create projects targeting Android, iOS, Windows,
  macOS, Linux, web, or a custom device/OS, with local release evidence that
  never claims an unavailable compiler ran.

## Source control and synchronization

- Before work: fetch and fast-forward local `main` from `origin/main` only
  after checking for dirty changes.
- After work: test, commit intended changes, push `main`, fast-forward the
  active AWS checkout, and verify local/AWS/GitHub hashes and clean worktrees.
- Never force-push, reset a worktree, delete divergent work, or overwrite
  uncommitted changes to resolve drift. Preserve divergent commits, patches,
  generated evidence, and backup branches first.
- The active host comes from `SPARTANCODE_REMOTE_HOST`. The KVM `c8i.xlarge`
  replacement is active; the former `t2.large` is stopped and preserved as
  fallback. Do not assume a stale IP.
- Keep AWS compute stopped when not actively needed. EBS storage charges may
  remain while a stopped fallback volume is preserved; never claim zero AWS
  cost without current billing evidence.

## Security, execution, and credentials

- Keep authentication, authorization, audit logging, least privilege, and
  dangerous-command policy intact. YOLO bypasses only the interactive mission
  approval prompt; it does not disable authentication, sandboxing, scope
  checks, encryption, or audit evidence.
- Never promise unbreakable encryption. Use standard reviewable cryptography
  and state its limits honestly.
- Proton Pass is the preferred primary store for keys and login references;
  use explicit `pass://` references. The OS vault is optional recovery
  storage. Proton Drive is optional encrypted artifact backup. Users need a
  Proton account to use Proton services.
- Never commit or transfer AWS/GitHub credentials, private keys, access tokens,
  Proton vault data, secure-vault state, or raw user data. Handoff records and
  screenshots must be sanitized.
- Imported skills, plugins, uncensored models, and external agents may be
  cataloged, but executable content must remain explicitly activated, bounded,
  auditable, and policy-gated.

## Testing and release evidence

- Required baseline: desktop `npm test`; Android typecheck, Jest, and format;
  VS Code focused tests; roadmap audit; and `git diff --check`.
- The beta critical path additionally requires KVM Android emulator smoke,
  desktop Playwright visual smoke, release manifest generation and independent
  verification, signed test artifacts, current screenshots, and sanitized
  evidence.
- Physical phone, headset, store, legal/privacy, public staffing, and provider
  administration gates are `PASS` only with matching evidence. Otherwise mark
  them `SKIP` or `BLOCKED` with a reason; do not quietly count them as tested.
- Keep screenshots and GitHub About/readme content professional and feature-
  focused; test internals belong in engineering documentation.

## Delegated-agent protocol

- Dispatch bounded, disjoint tasks continuously when slots are available.
- Do not delegate the immediate blocking critical path.
- Agents edit only their assigned scope, run focused tests, and do not commit or
  push unless explicitly assigned that release step.
- Close completed agents promptly, record results, and dispatch the next
  non-overlapping roadmap slice.
- The incoming agent repeats source-control and verification checks before
  accepting a handoff and leaves the same clean, synchronized state when
  handing back.
