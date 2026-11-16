# TeamSync Security Policy

**Document status:** Initial draft. The reporting address was supplied by the project owner; mailbox monitoring has not been independently verified. Confirm that it is monitored before relying on this policy. Review this policy with qualified counsel in India before formal commercial use.

## Supported versions

The repository does not define a release cadence, supported-version window, or security-maintenance period. There are no Git tags at the time this policy was reviewed. Until a support policy is published, reports are most useful when they identify the latest code on the default `main` branch and, if relevant, the exact version or commit being used. No support or remediation commitment for older or deployed builds is implied.

## Reporting a vulnerability

Please report suspected security vulnerabilities privately to **k.singh.codebase@gmail.com**. Do not post exploit details, credentials, personal information, or unpatched vulnerabilities in public issues, discussions, or pull requests.

Include, when safe and available:

- A concise description of the affected component and potential impact.
- Steps to reproduce using only systems and accounts you own or are explicitly authorized to test.
- Affected versions, configuration, and relevant environment details with secrets removed.
- Sanitized logs, screenshots, or proof-of-concept material that does not expose real user data.
- Your preferred contact method and whether you would like attribution.

Do not include passwords, tokens, private keys, live personal data, or other people's confidential information. If a report contains sensitive data, minimize further sharing and notify the maintainer.

## Research and disclosure expectations

Security research must be authorized and non-disruptive. Do not access, modify, retain, or disclose other users' data; do not impair service availability; do not use social engineering, denial-of-service testing, or destructive testing; and stop if testing exposes information outside your own authorized account.

Please allow the maintainer a reasonable opportunity to investigate and coordinate remediation before public disclosure. The maintainer will review reports, may request clarification, and will communicate status and disclosure coordination where practicable. No security team, acknowledgement deadline, remediation deadline, or response SLA is represented by this draft.

## Acknowledgement and response process

Once the supplied address is confirmed as monitored, the intended process is:

1. The maintainer reviews the report and acknowledges receipt as soon as reasonably practicable.
2. The maintainer assesses scope, impact, and reproduction details, and may ask for additional information.
3. The maintainer coordinates a fix or mitigation and a disclosure plan with the reporter where feasible.
4. The maintainer communicates when the issue is resolved or when further action is not planned.

These are process expectations, not guaranteed response times. Although an address has been supplied, this workspace cannot verify that it is monitored; confirm monitoring before relying on it as a security-reporting channel. If you cannot confirm a private reporting channel, do not publish exploit details or sensitive information in a public issue; wait for the maintainer to provide a verified private contact method.

## Implemented security controls and limitations

The following controls are present in the current backend source. Their presence does not constitute a security audit or production-readiness claim:

- Zod request/configuration validation and bcrypt password hashing.
- HS256 JWT access and refresh tokens with separate configured secrets; access tokens are bound to a MongoDB session, checked during Bearer authentication, and short-lived.
- Hashed refresh-token storage, server-side rotation, replay-family revocation, and single-session logout.
- HttpOnly refresh-token cookie and a signed double-submit CSRF token on refresh/logout. The CSRF token uses HMAC-SHA256, is bound to the refresh token, and is compared with a timing-safe operation.
- Exact trusted-Origin checks on registration, login, refresh, and logout.
- Helmet, configured CORS, and general plus route-specific `express-rate-limit` limits.

Known limitations include process-local in-memory rate-limit stores, no configured production proxy trust, no implemented workspace/resource RBAC or tenant authorization, no logout-all-devices, and no independent security audit. The CSRF cookie is issued at `Path=/` but logout currently clears it at `/api/v1/auth`; browser removal may therefore fail. See [Security and Access Model](docs/13_SECURITY_AND_ACCESS.md) for implementation details.

The current backend integration suite command is `node --test tests/integration/*.test.js`. It passed 47 tests on 2026-11-16 against the configured disposable test database. This test result is not a security certification.

For expected community behavior and conduct reporting, see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Conduct reports should not include vulnerability details.

## GitHub repository security recommendations

GitHub repository metadata reported the repository as **public on 2026-11-14**. The project owner's stated preference is to keep it public. Public visibility lets anyone access the source; a proprietary notice does not make the code confidential, prevent copying, or guarantee protection. Do not publish secrets or materials whose rights or disclosure have not been cleared. Revisit the visibility decision if confidentiality becomes a requirement. No GitHub setting was changed as part of this documentation task.

The following controls are recommendations, not claims that they are enabled. Verify and configure them in GitHub repository and organization settings:

- Require two-factor authentication for owners and collaborators.
- Grant collaborators only the minimum permissions needed; review access periodically and remove stale access.
- Protect the default branch: require pull requests, appropriate approvals and passing checks; dismiss stale approvals where suitable; block force-pushes and branch deletion.
- Require security-focused review for authentication, authorization, secrets, dependency, and data-handling changes.
- Enable Dependabot alerts and review dependency updates.
- Enable secret scanning and push protection where available; rotate any credential that is exposed.
- Review repository visibility, collaborator access, branch rules, Actions permissions, and installed GitHub Apps on a recurring basis.

The current state of two-factor authentication, collaborator permissions, branch protection, Dependabot, secret scanning, and push protection was not verified.
