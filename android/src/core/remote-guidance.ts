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
