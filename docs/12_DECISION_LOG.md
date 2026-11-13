# Decision Log

All decisions below are approved product/architecture baselines as of 2026-11-13 unless marked otherwise.

## ADR-001 — Modular monolith
- Date: 2026-11-13 | Status: ACCEPTED
- Decision: Start with modular monolith, not microservices.
- Rationale: Lower operational complexity with clear domain boundaries.

## ADR-002 — Separate WorkspaceMember collection
- Date: 2026-11-13 | Status: ACCEPTED
- Decision: Membership is separate with unique `{ workspace: 1, user: 1 }`.
- Consequence: A user may have different roles in different workspaces; workspace creation and OWNER membership are atomic.

## ADR-003 — Workspace roles
- Date: 2026-11-13 | Status: ACCEPTED
- Decision: `OWNER`, `ADMIN`, `MANAGER`, `MEMBER`.
- Consequence: Role names map to server-enforced action permissions; ADMIN cannot self-promote or transfer ownership.

## ADR-004 — Dark and light themes
- Date: 2026-11-13 | Status: ACCEPTED
- Decision: Support both themes using semantic design tokens.

## ADR-005 — Private-by-default project visibility
- Date: 2026-11-13 | Status: ACCEPTED
- Decision: Ordinary workspace membership does not automatically grant project access. Active ProjectMember grants ordinary member access. Workspace OWNER/ADMIN can administer all projects in their workspace; MANAGER requires explicit manager authority on each project.
- Rationale: Least privilege and narrower project-level access.
- Consequence: Project reads, writes, tasks, comments, chat, notifications and analytics must enforce project policy server-side.

## ADR-006 — Personal task privacy
- Date: 2026-11-13 | Status: ACCEPTED
- Decision: Personal tasks are owner-only and cannot be shared in R1.
- Consequence: Scope personal task queries by both task ID and owner ID.

## ADR-007 — R1 communication scope
- Date: 2026-11-13 | Status: ACCEPTED
- Decision: Include task comments and project-scoped chat in R1; direct/group messaging is R2.
- Consequence: Chat rooms and APIs require active project access.

## ADR-008 — Invitation lifecycle
- Date: 2026-11-13 | Status: ACCEPTED
- Decision: Email-bound, cryptographically random, single-use invitation token; store token hash only; seven-day expiry; authorized resend/revoke; atomic idempotent acceptance.
- Consequence: Invitation lifecycle and email delivery tests are required. Email provider remains TBD.

## ADR-009 — Browser token transport and session lifecycle
- Date: 2026-11-13 | Status: ACCEPTED
- Decision: 10–15 minute access JWT held in memory; refresh token in HttpOnly/Secure cookie with CSRF protection; server-tracked refresh session; rotate on use; reuse of rotated token revokes the session family.
- Consequence: Implement CSRF controls, rotation/reuse detection, session revocation and security regression tests. Deploy frontend/API with compatible same-site cookie settings where practical.

## ADR-010 — Account and workspace deletion
- Date: 2026-11-13 | Status: ACCEPTED
- Decision: Account deletion is soft-delete with 30-day recovery, then permanently delete/anonymize eligible data. Workspace deletion is OWNER-only, confirmation-gated and soft-delete-first.
- Consequence: Define dependent-data disposition and build controlled lifecycle jobs before production. Legal obligations may require policy adjustment.

## ADR-011 — Retention and backups
- Date: 2026-11-13 | Status: ACCEPTED
- Decision: Proposed product activity retention 180 days; security audit retention 365 days with restricted access; daily backups retained 30 days; restoration tests required.
- Consequence: Implement retention jobs and backup/restore runbooks; validate legal requirements before production.

## ADR-012 — R1 attachment scope
- Date: 2026-11-13 | Status: ACCEPTED
- Decision: Defer private task/chat attachments and private-file delivery/scanning to R2. Avatar handling must remain separate and controlled.
- Consequence: Do not expose private attachment APIs in R1.

## ADR-013 — MongoDB durable writes before real-time events
- Date: 2026-11-13 | Status: ACCEPTED
- Decision: MongoDB is source of truth; persist a state change/message before Socket.IO broadcast.
- Consequence: Use transactions where needed and evaluate outbox for reliable event fan-out.

## ADR-014 — Frontend architecture and state management
- Date: 2026-11-13 | Status: ACCEPTED (architectural choices); integration details remain OPEN.
- Context: TeamSync needs a maintainable frontend that can grow across personal productivity and multiple workspace features without mixing remote server data with local UI state. The repository has the initial Vite/React scaffold and declared frontend dependencies, but most application integrations are not yet wired.
- Decision:
  - Organize frontend code by feature, with shared application infrastructure, reusable UI, common and layout components, and feature-specific modules.
  - Use React Router for client-side routing.
  - Use TanStack Query for server state and Zustand for client-side global state; keep transient view state local to React components where appropriate.
  - Use Axios for HTTP communication, Lucide React for icons, and Tailwind CSS v4 for styling.
- Alternatives: A flat component-first source tree; hand-built routing; React Context or Redux for global state; component-local fetch state or another server-state library; the browser Fetch API; another icon library; CSS Modules or a component framework instead of Tailwind.
- Rationale: Feature boundaries align code with TeamSync product domains. Separating remote server state from client-owned UI state avoids duplicated ownership and makes caching, loading, mutation and error behavior explicit. The selected libraries are already declared in the frontend package and fit the approved React/Vite stack.
- Consequences: Keep shared infrastructure small and feature modules cohesive. Do not treat installed packages or scaffold directories as implemented functionality. Route definitions, provider wiring, store contents, API error/auth handling, real-time client integration, semantic token definitions and component APIs remain implementation details to be designed and tested. Existing security decisions, including memory-only access-token handling and CSRF-protected refresh-cookie flows, remain unchanged.
- Affected documentation and code: `PROJECT_CONTEXT.md`, `docs/04_UI_UX_GUIDELINES.md`, `docs/05_SYSTEM_ARCHITECTURE.md`, `docs/11_CHANGELOG.md`, `AGENTS.md`, `.cursor/rules/00-project.mdc`, `.cursor/rules/40-frontend.mdc`; `frontend/package.json`, `frontend/package-lock.json`, and the `frontend/src` scaffold.

## Open implementation choices (not blockers to R1 design)
- Production email provider and hosting selection.
- Exact permission catalogue and manager permission granularity within projects.
- Whether an outbox/background worker is needed for initial scale.
- Production retention/legal review and deletion exceptions.
- Avatar storage provider and upload constraints.

## Template
### ADR-NNN — Title
Date / Status / Context / Decision / Alternatives / Rationale / Consequences / Affected docs-code-tickets.
