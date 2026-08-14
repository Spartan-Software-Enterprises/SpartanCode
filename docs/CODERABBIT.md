# CodeRabbit integration

SpartanCode stores its CodeRabbit review policy in the repository-root
`.coderabbit.yaml`. GitHub-hosted CodeRabbit reviews are enabled for
non-draft pull requests targeting the canonical `main` branch, with focused
guidance for Electron IPC, renderer security, and standalone Android code.

Desktop users can open **Settings → CodeRabbit review → Log in to CodeRabbit**.
That action opens CodeRabbit’s official GitHub App sign-in page in the system
browser. Authentication is handled by GitHub and CodeRabbit; SpartanCode does
not collect or store a CodeRabbit password or OAuth token.

The local Termux environment keeps its own deterministic gates—Node tests,
Prettier, Android typecheck/tests, and Playwright visual smoke testing. The
CodeRabbit CLI is an optional workstation tool; GitHub-hosted review remains
the supported authentication path when the local platform cannot execute the
CLI binary.
