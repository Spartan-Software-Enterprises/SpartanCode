const MAX_ARTIFACTS = 500;

function normalizeArtifacts(value) {
  if (!Array.isArray(value) || value.length > MAX_ARTIFACTS)
    throw new Error(`Artifact set must contain at most ${MAX_ARTIFACTS} items`);
  const artifacts = value.filter(
    (artifact) =>
      artifact &&
      typeof artifact === "object" &&
      typeof artifact.id === "string" &&
      artifact.id.length > 0 &&
      artifact.id.length <= 160,
  );
  const ids = new Set();
  for (const artifact of artifacts) {
    if (ids.has(artifact.id))
      throw new Error(`Artifact ids must be unique: ${artifact.id}`);
    ids.add(artifact.id);
  }
  return artifacts;
}

function fingerprint(artifact) {
  if (!artifact) return null;
  return JSON.stringify({
    id: artifact.id,
    name: artifact.name || "",
    type: artifact.type || "",
    content: artifact.content ?? null,
    review: artifact.review || null,
  });
}

function mergeArtifactSets({ base = [], local = [], remote = [] } = {}) {
  const baseById = new Map(
    normalizeArtifacts(base).map((item) => [item.id, item]),
  );
  const localById = new Map(
    normalizeArtifacts(local).map((item) => [item.id, item]),
  );
  const remoteById = new Map(
    normalizeArtifacts(remote).map((item) => [item.id, item]),
  );
  const ids = new Set([
    ...baseById.keys(),
    ...localById.keys(),
    ...remoteById.keys(),
  ]);
  const merged = [];
  const conflicts = [];
  for (const id of ids) {
    const baseArtifact = baseById.get(id);
    const localArtifact = localById.get(id);
    const remoteArtifact = remoteById.get(id);
    const baseFingerprint = fingerprint(baseArtifact);
    const localFingerprint = fingerprint(localArtifact);
    const remoteFingerprint = fingerprint(remoteArtifact);
    if (localFingerprint === remoteFingerprint) {
      if (localArtifact) merged.push(localArtifact);
    } else if (localFingerprint === baseFingerprint) {
      if (remoteArtifact) merged.push(remoteArtifact);
    } else if (remoteFingerprint === baseFingerprint) {
      if (localArtifact) merged.push(localArtifact);
    } else {
      conflicts.push({
        id,
        base: baseArtifact || null,
        local: localArtifact || null,
        remote: remoteArtifact || null,
      });
      if (localArtifact) merged.push(localArtifact);
    }
  }
  return { merged, conflicts, requiresReview: conflicts.length > 0 };
}

module.exports = { MAX_ARTIFACTS, mergeArtifactSets, normalizeArtifacts };
