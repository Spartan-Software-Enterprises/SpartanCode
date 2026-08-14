export type RemoteProvider = {
  id: "digitalocean" | "linode" | "vultr" | "hetzner" | "aws";
  label: string;
  hourly: number;
  memoryGb: number;
};

export const remoteProviders: readonly RemoteProvider[] = [
  {
    id: "digitalocean",
    label: "DigitalOcean Basic",
    hourly: 0.006,
    memoryGb: 1,
  },
  { id: "linode", label: "Linode Nanode", hourly: 0.005, memoryGb: 1 },
  { id: "vultr", label: "Vultr Cloud", hourly: 0.006, memoryGb: 1 },
  { id: "hetzner", label: "Hetzner Shared", hourly: 0.004, memoryGb: 2 },
  { id: "aws", label: "AWS Lightsail", hourly: 0.007, memoryGb: 1 },
];

export const routerGuidance = {
  tailscale: {
    label: "Tailscale",
    exposure: "private",
    steps:
      "Install on both devices, join the same tailnet, and use the server's 100.x address over HTTPS.",
  },
  upnp: {
    label: "UPnP",
    exposure: "public",
    steps:
      "Forward only the bridge port, require a token, and disable the mapping when not in use.",
  },
  ngrok: {
    label: "ngrok",
    exposure: "public",
    steps:
      "Use a short-lived HTTPS tunnel and restrict it with identity or an allowlist.",
  },
} as const;

export const serverTemplates = [
  {
    id: "ubuntu-agent-server",
    label: "Ubuntu agent server",
    platform: "ubuntu",
    verification: ["node --version", "git --version"],
  },
  {
    id: "raspberry-pi-agent",
    label: "Raspberry Pi home server",
    platform: "raspberry-pi",
    verification: ["uname -m", "free -h"],
  },
] as const;

export function buildSetupPlan(
  templateId: (typeof serverTemplates)[number]["id"],
  routerMethod: keyof typeof routerGuidance = "tailscale",
) {
  const template = serverTemplates.find((item) => item.id === templateId);
  if (!template) throw new Error("Unknown server template");
  const router = routerGuidance[routerMethod];
  return {
    ...template,
    exposure: router.exposure,
    router: router.label,
    steps: [
      "Review the host and credentials before making changes.",
      "Install Git, Node.js, and the SpartanCode bridge using the host's package manager.",
      ...router.steps
        .split(".")
        .filter(Boolean)
        .map((step) => `${step}.`),
    ],
    verification: [...template.verification],
    requiresExplicitApproval: true,
    provisioning: "guidance-only",
  };
}

export function estimateRemoteCost(
  providerId: RemoteProvider["id"],
  hours = 730,
) {
  const provider = remoteProviders.find((item) => item.id === providerId);
  if (!provider) throw new Error("Unknown remote provider");
  const boundedHours = Number.isFinite(hours) && hours >= 0 ? hours : 730;
  return {
    ...provider,
    hours: boundedHours,
    estimatedMonthly: Number((provider.hourly * boundedHours).toFixed(2)),
  };
}
