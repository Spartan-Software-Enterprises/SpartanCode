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
