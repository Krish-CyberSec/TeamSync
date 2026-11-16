# Accessibility Statement

TeamSync intends to make its product and project materials usable by people with a broad range of abilities. Accessibility is a design and engineering goal, not a completed certification or audit result.

## Current status and supported environments

The frontend is currently a starter screen, not a complete SaaS client. No supported browser/operating-system matrix or accessibility audit has been established. The current page contains a heading, descriptive text, and a native button; the “Get Started” button has no implemented action. No automated accessibility test tooling or assistive-technology test results were found in the repository.

Do not interpret the use of semantic HTML or this statement as evidence of WCAG conformance. TeamSync's target is to work toward WCAG 2.2 Level AA for implemented user-facing workflows, subject to testing and remediation.

## Accessibility expectations

As product workflows are implemented, they should be designed and tested for:

- Keyboard operation, logical focus order, visible focus, and no keyboard traps.
- Semantic structure, accessible names and instructions, programmatic form labels, and announced validation/status messages.
- Screen-reader compatibility, including meaningful headings, landmarks, controls, and dynamic updates.
- Sufficient text and non-text contrast; do not communicate meaning by color alone.
- Browser zoom, responsive layouts, and reduced-motion preferences where motion is used.
- Accessible authentication, dialogs, navigation, and error recovery.

These are expectations for development; they are not claims about the current starter screen's conformance.

## Known limitations

- Product workflows and reusable UI components are not yet implemented.
- The starter “Get Started” button is inert.
- No accessibility audit, WCAG conformance assessment, supported environment matrix, or screen-reader testing is documented.
- Keyboard focus visibility and color contrast have not been comprehensively verified.

## Report an accessibility barrier

Report a barrier through the [Bug report issue form](https://github.com/Krish-CyberSec/TeamSync/issues/new?template=bug_report.yml). Describe the affected workflow, environment and assistive technology where relevant, and the result you expected. Do not include sensitive personal information, credentials, or confidential user data in a public issue. If you cannot report safely in public, use a private contact method confirmed by the project maintainer.

For general participation expectations, see the [Code of Conduct](CODE_OF_CONDUCT.md).
