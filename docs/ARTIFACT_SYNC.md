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

The Android client participates in this contract during bridge refresh: it
keeps the last remote artifact set as its bounded local base, submits the
current phone snapshot and remote snapshot for reconciliation, and stores the
merged result locally. A bridge that predates the sync route remains
snapshot-compatible; the client falls back to the remote snapshot rather than
silently treating an unavailable merge route as a successful local merge.
When conflicts exist, Android displays the affected IDs and the presence of
base, phone, and bridge versions while retaining the phone working copy; it
does not silently select a winner.

This is conflict-aware synchronization logic, not silent continuous syncing.
Proton Drive remains an encrypted backup/restore transport and does not receive
plaintext artifacts from this merge layer.
