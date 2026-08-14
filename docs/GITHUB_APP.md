# SpartanCode GitHub App integration

SpartanCode can optionally connect to GitHub as an installed GitHub App. The
desktop/server integration uses short-lived installation access tokens and
keeps the App private key in the process environment only. Android remains
standalone and does not require a desktop bridge or a GitHub account.

## Configure an app installation

Register a GitHub App under the owning account or organization, then install it
on only the repositories SpartanCode should operate on. Start with the minimum
permissions:

- Repository metadata: read-only (required by GitHub)
- Contents: read-only for repository browsing and HTTP Git access
- Issues and pull requests: add only when those workflows are enabled
- Codespaces: do not add to the installation-token path; Codespaces creation
  requires a user-authorized token with Codespaces write permission

The optional manifest configuration is in `docs/github-app-manifest.json`. A
manifest flow can provision a new app, but its callback must be hosted by the
deployment that receives the temporary conversion code. Never commit the
private key, webhook secret, installation token, or user token.

Set these variables in the desktop/server environment:

```text
SPARTANCODE_GITHUB_APP_ID=123456
SPARTANCODE_GITHUB_APP_INSTALLATION_ID=12345678
SPARTANCODE_GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"
SPARTANCODE_GITHUB_APP_WEBHOOK_SECRET="generate-a-random-secret"
```

The settings panel reports whether the installation is configured. Repository
metadata is available through the desktop API, and future GitHub workflows can
reuse the same installation-token client without persisting credentials.

When the optional MCP Bridge is enabled, configure the webhook secret and set
the GitHub App webhook URL to `/v1/github/webhook` on the secured bridge host.
SpartanCode verifies GitHub's `X-Hub-Signature-256` before publishing bounded
`github.*` events to the bridge event stream; raw webhook payloads are not
forwarded or persisted.

## Codespaces

Codespaces is a compatible optional workspace target, not a replacement for
the local desktop or Android app. The repository includes a dev container
definition, and a user can open the repository in Codespaces from GitHub. A
The desktop integration now includes a non-persistent, user-authorized
Codespaces client that can list, create, start, stop, and delete Codespaces.
The token is supplied by the caller and is never stored by this client. Creation
requests are validated and the UI must display a machine/storage cost estimate
before creation; a real OAuth callback, GitHub App registration, and production
billing/permission review remain deployment gates.

The app intentionally does not request Codespaces permission for its
installation token. This keeps repository automation narrow and prevents an
installed app from creating billable development environments without the
user's explicit GitHub authorization.

## Local-only users and encryption

GitHub is optional. Desktop workspaces remain ordinary local project folders so
editors, compilers, and Git can use them directly; mission metadata and secrets
are kept separately. Desktop secrets saved from Settings use an OS-backed
wrapped random 256-bit key and AES-256-GCM authenticated records. Android bridge
secrets use Android Keystore-backed SecureStore and can require device
biometrics. If the platform cannot provide protected storage, SpartanCode
refuses to save the secret instead of falling back to plaintext.
