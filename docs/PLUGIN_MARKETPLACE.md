# Plugin marketplace boundary

SpartanCode supports a signed metadata index and a safe artifact-staging step;
it does not execute arbitrary plugin code. The desktop isolated API accepts an
HTTPS index and an Ed25519 public key configured in the main process, verifies
the detached `signature`, and returns only validated metadata. The renderer
cannot supply or replace the verification key; verification fails closed when
`SPARTANCODE_MARKETPLACE_PUBLIC_KEY` is not configured.

The signed payload has this shape:

```json
{
  "schemaVersion": 1,
  "issuer": "publisher name",
  "plugins": [
    {
      "id": "review-persona",
      "name": "Review persona",
      "version": "1.0.0",
      "description": "A bounded review persona.",
      "license": "MIT",
      "capabilities": ["persona"],
      "publisher": "publisher name",
      "sourceUrl": "https://example.invalid/review-persona.tgz",
      "artifactSha256": "64-character-lowercase-or-uppercase-sha256"
    }
  ],
  "signature": "base64url-ed25519-signature"
}
```

The signature covers the canonical JSON payload with `signature` omitted.
Indexes are capped at 100 entries and 1 MiB. Every entry requires an explicit
MIT or Apache-2.0 license, a safe capability, an HTTPS source URL, and an
artifact digest. An explicitly selected entry may be downloaded over HTTPS,
bounded to 50 MiB, SHA-256 verified, and atomically staged in the application
cache with mode `0600` metadata. An explicit activation call can install the
validated declarative manifest into the workspace plugin registry after
rechecking the staged artifact digest. Declarative plugins remain opaque and
are never executed. A signed entry that explicitly declares `runtime: "node"`
and a bounded `entrypoint` may be run only after explicit activation through a
matching workspace manifest and dedicated child process. The runner uses Node's permission model, denies native
addons and child processes, uses no shell, passes a sanitized environment,
caps JSON input/output, and terminates after 15 seconds. Human review and
explicit activation remain required for executable behavior.

The desktop main process retains the exact normalized entries from the most
recently verified index. Download, activation, deactivation, and execution
IPC calls must match one of those entries byte-for-byte after normalization;
renderer-supplied or modified manifests are rejected. Verification is scoped
to the current process session, so a restart requires fetching and verifying
the index again. This provenance binding is part of the security contract and
must be covered by negative tests before marketplace changes are released.

Publisher admission, key rotation, incident response, and hosted distribution
controls are defined in [PLUGIN_GOVERNANCE.md](PLUGIN_GOVERNANCE.md). Those
controls remain an operational prerequisite for public marketplace distribution.
