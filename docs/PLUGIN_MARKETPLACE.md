# Plugin marketplace boundary

SpartanCode currently supports a signed metadata index, not arbitrary plugin
installation. The desktop isolated API accepts an HTTPS index and an Ed25519
public key, verifies the detached `signature`, and returns only validated
metadata.

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
artifact digest. This boundary deliberately does not download, install, load,
or execute marketplace code; artifact installation and update review remain
future release work.
