export type MobileExtension = {
  id: string;
  name: string;
  kind: "template" | "persona" | "plugin";
  description: string;
  offline: true;
};

export const bundledExtensions: readonly MobileExtension[] = [
  {
    id: "starter-react-native",
    name: "React Native starter",
    kind: "template",
    description: "Offline-first Expo shell with a typed test setup.",
    offline: true,
  },
  {
    id: "local-first-builder",
    name: "Local-first builder",
    kind: "persona",
    description: "Plans small, verifiable changes and prefers on-device work.",
    offline: true,
  },
  {
    id: "workspace-audit",
    name: "Workspace audit",
    kind: "plugin",
    description: "Summarizes mission, artifact, and policy-visible activity.",
    offline: true,
  },
];

export function listExtensions(kind?: MobileExtension["kind"]) {
  return bundledExtensions.filter((item) => !kind || item.kind === kind);
}
