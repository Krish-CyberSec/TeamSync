# TeamSync Security Policy

**Document status:** Initial draft. The reporting address below is a placeholder and must be replaced with a monitored contact before this policy is relied upon. Review this policy with qualified counsel in India before formal commercial use.

## Reporting a vulnerability

Please report suspected security vulnerabilities privately to **[SECURITY CONTACT EMAIL]**. Do not post exploit details, credentials, personal information, or unpatched vulnerabilities in public issues, discussions, or pull requests.

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

After a monitored address is established, the intended process is:

1. The maintainer reviews the report and acknowledges receipt as soon as reasonably practicable.
2. The maintainer assesses scope, impact, and reproduction details, and may ask for additional information.
3. The maintainer coordinates a fix or mitigation and a disclosure plan with the reporter where feasible.
4. The maintainer communicates when the issue is resolved or when further action is not planned.

These are process expectations, not guaranteed response times. Until the placeholder is replaced and monitored, there is no verified security-reporting channel.

## GitHub repository security recommendations

GitHub repository metadata reported the repository as **public on 2026-11-14**. Recheck visibility in GitHub before relying on it; a proprietary notice does not hide source code. If source access is intended to be restricted, consider changing visibility through the authorized repository owner. No change was made as part of this documentation task.

The following controls are recommendations, not claims that they are enabled. Verify and configure them in GitHub repository and organization settings:

- Require two-factor authentication for owners and collaborators.
- Grant collaborators only the minimum permissions needed; review access periodically and remove stale access.
- Protect the default branch: require pull requests, appropriate approvals and passing checks; dismiss stale approvals where suitable; block force-pushes and branch deletion.
- Require security-focused review for authentication, authorization, secrets, dependency, and data-handling changes.
- Enable Dependabot alerts and review dependency updates.
- Enable secret scanning and push protection where available; rotate any credential that is exposed.
- Review repository visibility, collaborator access, branch rules, Actions permissions, and installed GitHub Apps on a recurring basis.

The current state of two-factor authentication, collaborator permissions, branch protection, Dependabot, secret scanning, and push protection was not verified.
