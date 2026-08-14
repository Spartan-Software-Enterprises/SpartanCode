# External skill integration

SpartanCode integrates the three requested repositories through a pinned source
lock, a safe synchronizer, and a metadata-only registry:

- [Anthropic Cybersecurity Skills](https://github.com/CKissinger1988/Anthropic-Cybersecurity-Skills)
- [antigravity-skills](https://github.com/CKissinger1988/antigravity-skills)
- [antigravity-awesome-skills](https://github.com/CKissinger1988/antigravity-awesome-skills)

Run `npm run skills:sync` to place the pinned checkouts under
`.spartancode/external-skills/`. The desktop app discovers their `SKILL.md`
metadata automatically for the selected workspace. The exact commits and
license declarations live in [config/external-skills.json](../config/external-skills.json).

Imported skills are never executed as scripts by the registry. Metadata is
bounded, skills without a declared license remain `unverified`, and content
matching offensive, credential-handling, destructive, or bypass patterns is
marked `review-required` before Leo can use it. This is especially important
because the cybersecurity source explicitly contains dual-use offensive
procedures and its own authorized-use warning.

The source repositories are MIT or Apache-2.0 according to their checked-in
license files, but individual skill content still retains its source metadata.
Review each skill and its upstream changes before enabling it for an operational
workflow.
