const providerPlans = {
  digitalocean: {
    label: "DigitalOcean",
    plans: { basic: { label: "Basic shared CPU", hourly: 0.006, memoryGb: 1 } },
  },
  linode: {
    label: "Linode",
    plans: {
      nanode: { label: "Nanode shared CPU", hourly: 0.005, memoryGb: 1 },
    },
  },
  vultr: {
    label: "Vultr",
    plans: { cloud: { label: "Cloud compute", hourly: 0.006, memoryGb: 1 } },
  },
  hetzner: {
    label: "Hetzner",
    plans: { shared: { label: "Shared vCPU", hourly: 0.004, memoryGb: 2 } },
  },
  aws: {
    label: "AWS",
    plans: {
      lightsail: { label: "Lightsail Linux", hourly: 0.007, memoryGb: 1 },
    },
  },
};

const routerMethods = {
  tailscale: {
    label: "Tailscale",
    exposure: "private",
    steps: [
      "Install Tailscale on the server and phone.",
      "Sign in to the same tailnet and use the server's 100.x address.",
      "Keep the bridge bound to the tailnet interface and use HTTPS.",
    ],
  },
  upnp: {
    label: "UPnP",
    exposure: "public",
    steps: [
      "Confirm the router and server support authenticated UPnP.",
      "Forward only the required bridge port to the server.",
      "Disable the mapping when the server is not in use and require a token.",
    ],
  },
  ngrok: {
    label: "ngrok",
    exposure: "public",
    steps: [
      "Install the ngrok agent on the server and authenticate it.",
      "Create a short-lived HTTPS tunnel to the local bridge port.",
      "Restrict the tunnel with an allowlist or identity policy.",
    ],
  },
};

const serverTemplates = [
  {
    id: "ubuntu-agent-server",
    name: "Ubuntu agent server",
    description:
      "A small Ubuntu host with Node.js, Git, and the SpartanCode bridge.",
    platform: "ubuntu",
    verification: [
      "node --version",
      "git --version",
      "systemctl --user status spartancode-bridge",
    ],
  },
  {
    id: "raspberry-pi-agent",
    name: "Raspberry Pi home server",
    description:
      "A low-power self-hosted workspace reached through a private tailnet.",
    platform: "raspberry-pi",
    verification: [
      "uname -m",
      "free -h",
      "systemctl --user status spartancode-bridge",
    ],
  },
];

function listServerProviders() {
  return Object.entries(providerPlans).map(([id, provider]) => ({
    id,
    label: provider.label,
    plans: Object.entries(provider.plans).map(([planId, plan]) => ({
      id: planId,
      ...plan,
    })),
  }));
}

function estimateServerCost(providerId, planId, hours = 730) {
  const provider = providerPlans[providerId];
  const plan = provider?.plans[planId];
  if (!plan) throw new Error("Unknown server provider or plan");
  const boundedHours = Number.isFinite(hours) && hours >= 0 ? hours : 730;
  const monthly = Number((plan.hourly * boundedHours).toFixed(2));
  return {
    provider: provider.label,
    plan: plan.label,
    memoryGb: plan.memoryGb,
    hourly: plan.hourly,
    hours: boundedHours,
    estimatedMonthly: monthly,
    disclaimer:
      "Estimate excludes provider taxes, storage, bandwidth, backups, and model downloads.",
  };
}

function getRouterGuidance(methodId) {
  const guidance = routerMethods[methodId];
  if (!guidance) throw new Error("Unknown router traversal method");
  return { method: methodId, ...guidance };
}

function listServerTemplates() {
  return serverTemplates.map((template) => ({
    ...template,
    verification: [...template.verification],
  }));
}

module.exports = {
  estimateServerCost,
  getRouterGuidance,
  listServerProviders,
  listServerTemplates,
};
