# Plugin marketplace boundary

SpartanCode supports a signed metadata index and a safe artifact-staging step;
it does not execute arbitrary plugin code. The desktop isolated API accepts an
HTTPS index and an Ed25519 public key, verifies the detached `signature`, and
returns only validated metadata.

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
cache with mode `0600` metadata. Staging does not extract, load, activate,
replace, update, or execute code; human review and an explicit installer remain
required before an artifact can become active.
