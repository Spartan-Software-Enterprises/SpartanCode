export type SyncArtifact = {
  id: string;
  name?: string;
  type?: string;
  content?: string | null;
  review?: unknown;
};

export type ArtifactSyncResult = {
  merged: SyncArtifact[];
  conflicts: Array<{
    id: string;
    base: SyncArtifact | null;
    local: SyncArtifact | null;
    remote: SyncArtifact | null;
  }>;
  requiresReview: boolean;
};

const MAX_ARTIFACTS = 500;

function normalize(value: unknown): SyncArtifact[] {
  if (!Array.isArray(value) || value.length > MAX_ARTIFACTS)
    throw new Error(`Artifact set must contain at most ${MAX_ARTIFACTS} items`);
  const ids = new Set<string>();
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw new Error(`Artifact ${index} must be an object`);
    const artifact = item as SyncArtifact;
    if (
      typeof artifact.id !== "string" ||
      artifact.id.length === 0 ||
      artifact.id.length > 160
    )
      throw new Error(`Artifact ${index} id is invalid`);
    if (ids.has(artifact.id))
      throw new Error(`Artifact ids must be unique: ${artifact.id}`);
    ids.add(artifact.id);
    return artifact;
  });
}

function fingerprint(item: SyncArtifact | undefined) {
  if (!item) return null;
  return JSON.stringify({
    id: item.id,
    name: item.name || "",
    type: item.type || "",
    content: item.content ?? null,
    review: item.review || null,
  });
}

export function mergeArtifactSets(input: {
  base?: unknown;
  local?: unknown;
  remote?: unknown;
}): ArtifactSyncResult {
  const base = new Map(
    normalize(input.base || []).map((item) => [item.id, item]),
  );
  const local = new Map(
    normalize(input.local || []).map((item) => [item.id, item]),
  );
  const remote = new Map(
    normalize(input.remote || []).map((item) => [item.id, item]),
  );
  const ids = new Set([...base.keys(), ...local.keys(), ...remote.keys()]);
  const merged: SyncArtifact[] = [];
  const conflicts: ArtifactSyncResult["conflicts"] = [];
  ids.forEach((id) => {
    const baseItem = base.get(id);
    const localItem = local.get(id);
    const remoteItem = remote.get(id);
    const baseValue = fingerprint(baseItem);
    const localValue = fingerprint(localItem);
    const remoteValue = fingerprint(remoteItem);
    if (localValue === remoteValue) {
      if (localItem) merged.push(localItem);
    } else if (localValue === baseValue) {
      if (remoteItem) merged.push(remoteItem);
    } else if (remoteValue === baseValue) {
      if (localItem) merged.push(localItem);
    } else {
      conflicts.push({
        id,
        base: baseItem || null,
        local: localItem || null,
        remote: remoteItem || null,
      });
      if (localItem) merged.push(localItem);
    }
  });
  return { merged, conflicts, requiresReview: conflicts.length > 0 };
}
