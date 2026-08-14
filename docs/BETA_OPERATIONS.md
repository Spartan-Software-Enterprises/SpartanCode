# SpartanCode beta operations

This document defines the lightweight intake and verification loop for a
public beta. It keeps user feedback actionable without collecting credentials,
private source code, or unnecessary device data.

## Intake

- Use the GitHub **Bug report** form for reproducible failures. Include the
  app version or commit, client, operating environment, minimal reproduction,
  and sanitized evidence.
- Use the **Feature request** form for workflow proposals. Include the target
  client and observable acceptance criteria.
- Report suspected vulnerabilities through GitHub Security Advisories, never
  through a public issue. The repository security policy remains authoritative.
- Do not attach API keys, access tokens, private repositories, raw audit
  exports, or unredacted screenshots. Rotate a credential immediately if it is
  accidentally disclosed.

## Triage loop

1. Confirm the report is reproducible or label it `needs-reproduction`.
2. Remove secrets and personal data from any retained evidence.
3. Classify the report as bug, security, release blocker, or enhancement.
4. Link the issue to a roadmap row when it changes a documented capability.
5. For a fix, require a regression test or a documented environment check and
   record the verified commit SHA.
6. Close only after the reporter-facing behavior and release evidence are
   confirmed; unresolved environment gates stay visible in
   `docs/ROADMAP_STATUS.md`.

## Release feedback checklist

Before each beta build, the maintainer records:

- target commit SHA and generated release evidence;
- desktop unit, formatting, build, and visual results;
- Android typecheck, test, matrix, and emulator/device results when available;
- known environment-dependent limitations and recovery instructions;
- links to outstanding release-blocking issues.

The workflow is intentionally compatible with a local-only Android user: an
Android report must not require a desktop installation or MCP Bridge to be
filed or reproduced. Private diagnostics are opt-in and must be redacted before
sharing.

Android’s local feedback draft is intentionally bounded to 25 records, 2,000
characters of details per record, and no attachments or raw diagnostics. It is
an offline preparation aid, not a second project archive; users may safely
remove disposable caches and reinstallable dependencies without removing
source, credentials, or release archives.

## Maintainer response targets

These are operating targets, not guarantees: acknowledge valid beta reports
within seven days, triage security reports privately as soon as practical, and
publish a disposition or follow-up issue for reproducible non-security reports.
