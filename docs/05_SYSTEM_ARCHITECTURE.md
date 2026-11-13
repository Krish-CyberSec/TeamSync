# System Architecture

**Status:** R1 baseline frozen — 2026-11-13

## Style and stack
Modular monolith. React + Vite + Tailwind; Node.js + Express; MongoDB + Mongoose; Zod; Socket.IO; Jest + Supertest; OpenAPI/Swagger. Passwords use bcrypt. Do not introduce microservices without a new approved decision.

## Authentication/session architecture
- Access JWT lifetime: 10–15 minutes.
- Refresh session is server-tracked; persist a hash/opaque session identifier, never the raw refresh token.
- Browser holds access token in memory. Refresh token is delivered in an `HttpOnly`, `Secure` cookie; apply CSRF protection to cookie-authenticated refresh/logout flows and configure strict trusted origins.
- Rotate refresh token on every successful refresh. Detect reuse of a previously rotated token and revoke the affected session family, requiring re-authentication.
- Revoke sessions on logout, password change and security response.
- Validate JWT signature, expiry, issuer/audience where configured and token purpose.

## Request flow
Browser → HTTPS → Express route → rate limiting/authentication/CSRF/request validation/authorization middleware → controller → service → Mongoose → MongoDB. Socket.IO authenticates against the same identity/session model and authorizes each room join and sensitive event. Persist state before emitting.

## Backend modules
R1: auth, users, workspaces, members, projects, tasks, comments, notifications, activities, project chat, analytics. Calendar and file modules are staged for later releases; do not build R2 scope as part of R1 without approval.

## Layer rules
Routes define endpoints; middleware handles cross-cutting concerns; controllers translate HTTP; services implement business rules; models/data access persist; socket handlers authorize and deliver events.

## Tenant and project access model
User↔Workspace is many-to-many through WorkspaceMember. ProjectMember grants ordinary member access to a private project. Workspace OWNER/ADMIN can administer all projects in their workspace. MANAGER must have explicit manager authority on a project. Every task/comment/chat/notification/activity query is scoped through the relevant project/workspace and action permission. Personal tasks are owner-scoped.

## Invitations
Generate cryptographically random single-use invitation tokens; store only token hashes. Invitations are bound to an email and expire after seven days. Resend/revoke are administrative operations. Acceptance verifies identity, token hash, pending status and expiry; membership creation is atomic and idempotent.

## Transactions and durable events
Workspace + OWNER membership creation and invitation acceptance + membership creation are atomic on a replica-set-capable MongoDB deployment. Persist task/chat changes before creating downstream notifications/activity and emitting Socket.IO events. Use transaction or outbox where consistency requirements warrant it.

## Lifecycle, retention and operations
Account deletion: soft-delete and 30-day recovery window, then permanently delete/anonymize eligible data. Workspace deletion: OWNER-only, confirmation-gated, soft-delete-first and controlled dependent-data workflow. Proposed product activity retention: 180 days; security audit retention: 365 days, restricted access. Daily backups retained 30 days; restoration tests required. Validate legal obligations before production.

## Deployment baseline
Frontend Vercel/CDN; API Render/Railway; MongoDB Atlas. Email provider remains TBD. Keep secrets in environment/secret management; CI runs tests/build before deployment.

## Deferred decisions
Email provider and production hosting selection; exact permission catalogue and project-specific manager capabilities; outbox/background worker infrastructure; file scanning/private delivery provider; legal review of retention and deletion policies; MFA recovery design.
