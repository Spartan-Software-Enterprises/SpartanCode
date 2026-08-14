# Marketplace publisher governance

This contract defines the minimum operating controls for a future hosted
SpartanCode marketplace. It does not authorize public distribution, silently
trust a publisher, or replace legal, security, or product-owner approval.

## Publisher admission

Each publisher must provide an accountable organization or maintainer, a
stable contact, a public license statement, and a documented security contact.
The publisher identity in a catalog is metadata only; trust is established by
the separately distributed Ed25519 public key and the release record that
approved it.

Before admission, maintainers review:

- manifest schema, capabilities, source URL, license, and artifact digest;
- declared runtime and entrypoint, if executable behavior is requested;
- dependency, native-addon, child-process, network, and data-collection claims;
- reproducible publisher output and a clean key/index overwrite check; and
- a rollback contact and a proposed response timeline for compromised artifacts.

Admission evidence records the catalog commit or digest, public-key fingerprint,
reviewer, decision, and any capability restrictions. Private signing keys never
enter the repository, CI logs, application bundle, or issue tracker.

## Catalog and release controls

Every published catalog is immutable by digest. An update creates a new signed
catalog and release record; it never mutates an existing artifact in place.
Reviewers verify the canonical signature, every artifact digest, license,
capability set, and source URL before promotion. The release record also binds
the catalog to the repository commit, verification result, and rollback target.

Executable plugins require a separate explicit review and activation decision.
They are not enabled merely because a signed catalog contains `runtime: "node"`.
Declarative plugins remain the default and are never executed by the importer.

## Key rotation and incident response

Key rotation is a signed, authenticated configuration change with an overlap
period. The old fingerprint, new fingerprint, effective time, reviewer, and
rollback key are recorded. A lost or suspected-compromised key is revoked from
the trust configuration; it is not replaced by silently accepting a new key.

For a malicious, compromised, or materially unsafe artifact:

1. freeze promotion of the affected catalog and preserve its digest;
2. revoke the publisher key or entry as appropriate;
3. publish a signed revocation/withdrawal record and affected versions;
4. notify affected users through the configured release channel;
5. retain sanitized evidence and the incident timeline; and
6. restore the last known-good catalog only after independent review.

The desktop client must fail closed when trust, signature, digest, or provenance
checks do not validate. A takedown record must not delete unrelated workspace
plugins or user data.

## Distribution boundary

Hosted index storage, CDN configuration, publisher onboarding, abuse handling,
legal terms, privacy notices, and service-level commitments remain deployment
and product-owner work. Until those controls are approved, the repository
supports local publisher tooling and explicitly configured signed indexes only.
