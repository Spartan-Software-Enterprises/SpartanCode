# SpartanCode compliance and attribution notes

This document records product behavior and release obligations. It is not
legal advice; a commercial release should be reviewed for its target markets.

## Data and biometric boundaries

- Biometric unlock is opt-in. SpartanCode receives only the platform
  authentication result; it does not collect, persist, or transmit biometric
  templates or raw biometric data.
- Disabling biometric unlock or clearing bridge tokens removes the app's local
  secret-access preference and stored bridge secrets. Offline missions remain
  available when authentication hardware is absent.
- Bridge tokens are stored in origin-scoped Expo SecureStore entries on
  Android. Desktop connection profiles exclude passwords, private keys, and
  tokens from the persisted workspace snapshot.
- Bridge deployments may provide a token-to-scope map to enforce least
  privilege for read, audit, event, collaboration, mission, approval, and
  artifact operations. The bridge also supports an explicitly configured
  OIDC issuer through `SPARTANCODE_BRIDGE_OIDC_ISSUER` and
  `SPARTANCODE_BRIDGE_OIDC_AUDIENCE` (with optional
  `SPARTANCODE_BRIDGE_OIDC_JWKS_URI`). It verifies RS256 signatures, issuer,
  audience, expiry, and scope claims with cached JWKS metadata. Key rotation
  remains a provider/deployment operation; restart or clear the verifier cache
  after a provider revokes keys.
- Mission, approval, artifact, and policy activity is retained in the local
  workspace store so users can review decisions. A production distribution
  must publish a retention and deletion policy appropriate to its jurisdiction.
- Desktop audit export produces a bounded JSON bundle with credential-key
  redaction and a SHA-256 integrity digest. The digest proves export integrity;
  it does not replace retention, access-control, or legal-review obligations.

## Evidence map for roadmap item 35

The repository can substantiate the following implementation boundaries from
source and automated coverage:

- `src/main/oidc.js` validates configured RS256 OIDC tokens, including issuer,
  audience, expiry, not-before, signing-key selection, and scope extraction.
- `src/main/mcp-bridge.js` authenticates bridge requests and maps routes to
  snapshot, audit, event, collaboration, mission, approval, and artifact
  scopes. Non-authenticated requests are rejected when authentication is
  configured.
- `src/main/audit-export.js` bounds exported events, redacts credential-named
  fields, and includes a SHA-256 digest that can detect later modification.
- `scripts/release-manifest.js` records these source-control evidence entries
  alongside artifact hashes and lockfile component metadata. These entries are
  an implementation inventory, not a certification, penetration-test result,
  or production approval.

The remaining item-35 gates are intentionally not represented as complete:
provider-specific SSO account provisioning and lifecycle administration,
deployment configuration and key rotation operations, jurisdiction-specific
privacy/retention/deletion decisions, and release-owner or legal review.

## Model and dependency policy

- Built-in mobile distribution entries remain limited to explicitly reviewed
  MIT and Apache-2.0 models. User-selected Hugging Face repositories may be
  discovered and prepared locally with source/license metadata intact.
  Downloads require HTTPS and can verify a supplied SHA-256 checksum.
- No model is silently redistributed from an unlicensed or license-unknown
  source. User-selected Hugging Face models may be discovered and prepared
  locally, but their repository license and source metadata remain attached and
  SpartanCode does not claim or redistribute those rights.
- Third-party package licenses are represented by the committed lockfiles;
  release automation must include the generated notices for the shipped
  desktop and Android artifacts.

## Release checklist

Before a commercial release, maintainers must complete the following outside
the ordinary unit-test gate:

1. Review third-party and model licenses, including generated notices.
2. Publish privacy, retention/deletion, and terms documents for the markets
   where the product is offered.
3. Confirm jurisdiction-specific consent and opt-out requirements for the
   optional biometric feature.
4. Produce a signed Android AAB/APK with release-owned credentials kept out of
   Git and CI logs. The guarded tag/manual GitHub Actions workflow consumes
   only the documented secret names and uploads the resulting artifacts and
   evidence without storing the keystore.
5. Run physical-device accessibility, low-storage, interrupted-download,
   offline/reconnect, and process-restart acceptance tests.
6. Record the release commit, artifact checksums, and verification results.

The generated evidence must also pass the independent verifier before it is
published:

```bash
node scripts/verify-release-evidence.js \
  --manifest dist/release-evidence/release-manifest.json
```

The verifier fails closed if an artifact is missing or modified, a recorded
source-control evidence file is absent, a path escapes the checkout, notices
omit a component or artifact hash, or the manifest commit differs from the
current checkout. This is release-integrity evidence, not a signature,
attestation, legal review, or proof that the release is secure.

The repository's automated checks prove implementation invariants but do not
substitute for these release-environment or legal-review gates.
