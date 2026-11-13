# Changelog

## 2026-11-14 — Backend auth, error and session primitives documented
- Documented: the current workspace's login route/service/validation, mounted error handler, JWT helpers, and Session model, alongside the existing registration and health endpoints.
- Clarified: login returns only a user DTO; token helpers and the Session schema are not integrated into login, refresh, logout, or revocation workflows.
- Recorded: implementation status and user-reported manual Postman/MongoDB outcomes separately from automated test coverage.
- Verified for this documentation update: 14 backend JavaScript files passed `node --check`; an in-process smoke check confirmed health 200, registration/login validation 400, and JWT sign/verify claims. No MongoDB connection or Postman workflow was independently tested.
- Source status: these backend implementation changes are present in the working tree but remain uncommitted; this entry documents the inspected workspace state.
- No new ADR: the JWT/session work follows the existing ADR-009 design; no new architectural decision was identified.

## 2026-11-14 — Initial backend foundation
- Added: Express application/server bootstrap, Zod environment parsing, MongoDB connection, Helmet and configured CORS middleware, health route, registration route/validation/service, and a bcrypt-backed User model.
- Configured: backend runtime dependencies and `dev`/`start` scripts; `backend/.env.example` documents non-secret configuration placeholders.
- Documented: active health and registration contracts, current data-model scope, local startup, validation status, and security gaps.
- Not implemented: email verification, login/JWT/session lifecycle, authorization, centralized error handling, rate limiting, CSRF protection, and automated backend tests.
- Ticket: no matching feature ticket found in the repository.

## 2026-11-13 — Frontend source structure scaffold
- Added: app, component, feature, hook, library, page and style directory scaffolding under `frontend/src`; shared Axios and TanStack Query client instances.
- Changed: moved the app stylesheet into `styles/` and documented the source layout in the frontend README.
- Configured: React/Vite and Tailwind CSS v4 build plugins; frontend package declarations and lockfile include React Router, TanStack Query, Zustand, Axios, Lucide React and Tailwind CSS. The shared API client defaults to `/api/v1` and accepts `VITE_API_BASE_URL`.
- Verified: frontend lint and production build completed successfully.
- Deferred: router and application-provider wiring, Zustand stores, feature UI, API calls/auth handling, Socket.IO client, theme tokens and persistent theme behavior. Installed dependencies and scaffold directories are not implemented product functionality.

## 2026-11-13 — Backend source structure scaffold
- Added: initial backend config, module, middleware, database, utility and test directories; placeholder `app.js` and `server.js`; package metadata and README.
- Configured: blank local environment file and non-secret `.env.example`; repository ignore rules exclude `.env`.
- Deferred: runtime dependencies, environment validation, Express application/server, database connection, routes/controllers/services, authentication, and automated tests. The scaffold does not provide a runnable backend.

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