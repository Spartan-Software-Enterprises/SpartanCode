# Built-in project previews

SpartanCode includes a native Electron preview window for local development
servers. Open **Preview** from the desktop top bar, enter a URL such as
`http://localhost:3000`, and the preview opens in its own IDE-managed window.

The preview surface is intentionally limited to loopback hosts:

- `localhost`
- `127.0.0.1`
- `[::1]`

Only HTTP and HTTPS URLs are accepted. Popups are blocked and navigation away
from the local preview is rejected. This keeps project previews useful for Vite,
Next.js, Expo web, and other local dev servers without turning the preview
surface into an unrestricted browser.

The Playwright visual smoke suite opens the preview dialog and verifies that a
public URL is rejected. Prettier runs as part of the normal desktop test gate.

## Browser automation

The desktop IPC boundary also exposes a separate Playwright automation adapter
for agent workflows. It supports bounded navigation and text extraction only;
each request requires an explicit domain allowlist supplied by
`SPARTANCODE_BROWSER_ALLOWLIST` or the request, enforces a 30-second maximum
timeout, disables downloads, limits extracted text, and records a redacted
activity event. It is independent from the preview window and reports
`browser-download-required` until Chromium is installed.
