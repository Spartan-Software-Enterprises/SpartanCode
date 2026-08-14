# Home-server setup assistant

SpartanCode can generate a provider-neutral, reviewable setup plan for an
Ubuntu agent server or Raspberry Pi home server. The desktop settings surface
and Android app use the same bounded templates and router exposure guidance.

The assistant is deliberately guidance-only. It does not provision accounts,
install a systemd unit, open router ports, change firewall rules, or execute
commands. Users review and run the displayed commands on a host they control.
Tailscale is the default private-network recommendation; UPnP and ngrok are
available as explicitly selected alternatives and are marked public exposure.

Each plan includes prerequisites, setup checks, router guidance, verification
commands, and warnings. SSH credentials and Proton, GitHub, or API keys remain
user-controlled and are never embedded in a generated plan.
