# Artifact synchronization

SpartanCode uses a bounded three-way merge for artifact synchronization:

- `base` is the last common snapshot;
- `local` is the phone or desktop copy;
- `remote` is the bridge or backup copy.

Changes made on only one side are applied automatically. Divergent edits are
returned as explicit conflicts with all three versions and `requiresReview:
true`; the local value is retained as the non-destructive working copy until a
user resolves the conflict. Inputs are limited to 500 artifacts and the
authenticated bridge endpoint is `POST /v1/artifacts/sync` with the
`artifacts:write` scope.

This is conflict-aware synchronization logic, not silent continuous syncing.
Proton Drive remains an encrypted backup/restore transport and does not receive
plaintext artifacts from this merge layer.
