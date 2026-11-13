# Changelog

## 2026-11-13 — R1 baseline approved and frozen
- Approved private-by-default projects with ProjectMember access; workspace OWNER/ADMIN administration and explicit manager project authority.
- Confirmed personal tasks are owner-only and non-shareable in R1.
- Confirmed R1 task comments and project-scoped chat; direct/group messaging deferred to R2.
- Approved email-bound, single-use, hashed invitations with seven-day expiry and resend/revoke lifecycle.
- Approved 10–15 minute access JWT in memory and rotating server-tracked refresh session in HttpOnly/Secure cookie with CSRF protection; refresh-token reuse revokes session family.
- Approved account soft-delete with 30-day recovery; workspace OWNER-only soft-delete-first flow.
- Approved proposed 180-day product activity retention, 365-day restricted security audit retention and daily backups with 30-day retention plus restore tests; legal review required before production.
- Deferred private task/chat attachments to R2.
- Updated PRD, SRS, architecture, database schema, API plan, roadmap, testing strategy, security model, decision log, project context and AI implementation guidance.

## 2026-11-13 — Initial documentation system
- Established TeamSync as a multi-workspace collaboration and personal productivity platform.
- Recorded React/Vite/Tailwind and Node/Express/MongoDB baseline.
- Confirmed modular monolith architecture.
- Confirmed separate WorkspaceMember collection and unique workspace/user index.
- Recorded OWNER, ADMIN, MANAGER and MEMBER roles.
- Added shared AI instructions, project context, PRD, SRS, UI/UX, architecture, database, API, roadmap, testing and deployment docs.

## Entry template
### YYYY-MM-DD — Change title
- Type:
- Reason:
- Decision/change:
- Affected docs:
- Affected code/tickets:
- Migration/compatibility impact:
- Approved by:
