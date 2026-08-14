# Plugin authoring

Authors can validate a declarative plugin manifest before submitting it to a
workspace or signed marketplace index:

```sh
npm run plugin:validate -- /absolute/path/to/plugin.json
```

The validator accepts only lowercase kebab-case IDs, semantic versions, an
explicit MIT or Apache-2.0 license, a description, and the safe capabilities
`template`, `persona`, `audit`, or `runtime-adapter`. It prints a normalized
manifest and ignores undeclared fields. It never loads, extracts, imports, or
executes plugin artifacts.

Marketplace publishers must additionally provide an HTTPS source URL, a
SHA-256 artifact digest, a unique ID, and an Ed25519-signed index. The desktop
marketplace flow rechecks the digest before activating only the declarative
manifest; executable artifact installation remains an explicit reviewed gate.

## Publishing a signed catalog

The repository includes a dependency-free publisher helper. Generate the
Ed25519 key pair once in a private publisher directory; keep the private key
in Proton Pass or another release secret store and publish only the public key:

```sh
npm run plugin:publisher -- keygen --output-dir /absolute/publisher-keys
npm run plugin:publisher -- build-index \
  --issuer "Example publisher registry" \
  --manifest-dir /absolute/plugin-manifests \
  --private-key /absolute/publisher-keys/marketplace-signing-private.pem \
  --output /absolute/public/index.json
```

The publisher validates every manifest using the same contract as the desktop
client, signs the canonical catalog with Ed25519, and refuses to overwrite
keys or an existing index. Host the resulting index and referenced artifacts
over HTTPS. Rotate a publisher key by distributing the new public key through
an authenticated release/configuration update; never commit private keys or
embed them in the application.
