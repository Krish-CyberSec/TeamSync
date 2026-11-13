# System Architecture

**Status:** R1 baseline frozen — 2026-11-13

## Style and stack
Modular monolith. React + Vite + Tailwind CSS v4; React Router; TanStack Query; Zustand; Axios; Lucide React; Node.js + Express; MongoDB + Mongoose; Zod; Socket.IO; Jest + Supertest; OpenAPI/Swagger. Passwords use bcrypt. Do not introduce microservices without a new approved decision.

## Frontend architecture
The approved frontend organization is feature-oriented:
- `app/` owns application bootstrap concerns, routing, providers and app-wide stores.
- `features/` groups feature-specific components and behavior by domain, including auth, workspace, projects, tasks, notifications and chat.
- `components/ui/` contains reusable primitives; `components/common/` contains shared cross-feature components; `components/layout/` contains shared page and navigation structure.
- `pages/` composes route-level screens; `hooks/` holds genuinely shared hooks; `lib/` holds shared infrastructure such as the Axios and TanStack Query client instances; `styles/` holds shared styles; `assets/` holds static assets.

Use React Router for routing, TanStack Query for remote server state, and Zustand for client-side global state. Keep short-lived component/view state local to React where practical. Do not duplicate server-owned records in a client store. Any access JWT remains memory-only under ADR-009; the exact store ownership for auth state is an implementation detail and must not change the approved token transport. Axios is the HTTP client, Lucide React is the icon set, and Tailwind CSS v4 is the styling utility layer. Design tokens and theme behavior follow the UI guidelines.

This is the approved architecture, not a claim that its runtime integrations exist. As verified on 2026-11-13, `frontend/src` has the directory scaffold and shared Axios/QueryClient instances, but `main.jsx` mounts only React StrictMode and `App`; there is no configured router, application provider, Zustand store, feature implementation or API request integration. The instances are not yet consumed by the application.

## Authentication/session architecture
- Access JWT lifetime: 10–15 minutes.
- Refresh session is server-tracked; persist a hash/opaque session identifier, never the raw refresh token.
- Browser holds access token in memory. Refresh token is delivered in an `HttpOnly`, `Secure` cookie; apply CSRF protection to cookie-authenticated refresh/logout flows and configure strict trusted origins.
- Rotate refresh token on every successful refresh. Detect reuse of a previously rotated token and revoke the affected session family, requiring re-authentication.
- Revoke sessions on logout, password change and security response.
- Validate JWT signature, expiry, issuer/audience where configured and token purpose.

## Backend request flow
Browser → HTTPS → Express route → rate limiting/authentication/CSRF/request validation/authorization middleware → controller → service → Mongoose → MongoDB. Socket.IO authenticates against the same identity/session model and authorizes each room join and sensitive event. Persist state before emitting.

## Planned frontend communication flow (not yet implemented)
Route-level screens and feature components will use TanStack Query for server reads and mutations, which will call the shared Axios client at the versioned `/api/v1` base. The current Axios instance uses `VITE_API_BASE_URL` when configured and otherwise defaults to `/api/v1`. The Express API remains responsible for input validation, authentication, authorization and tenant/resource isolation; client-side navigation or visibility is never an access-control boundary. The browser follows ADR-009: access JWT in memory, refresh token in an HttpOnly/Secure cookie with CSRF protection, rotation and reuse detection. Durable data remains in MongoDB; Socket.IO is delivery only and events follow persistence. The frontend currently has no API calls or Socket.IO client integration, and its intended route/provider composition is still open.

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
