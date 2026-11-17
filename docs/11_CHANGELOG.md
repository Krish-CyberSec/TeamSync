# Changelog

## 2026-11-17 — Workspace membership and invitation progress documented
- Updated: project context, PRD/SRS implementation notes, architecture, database schema, API reference, security model, testing strategy, deployment guide and roadmap to match the current workspace source.
- Documented: `WorkspaceMember` status/actor/timestamp fields and unique workspace/user index; accepted-member authorization; the registered-user invitation endpoint, response/error contracts, OWNER/ADMIN checks, email normalization, duplicate/self-invitation prevention, declined-row reuse and duplicate-key race handling.
- Recorded: the membership-status backfill migration and safe execution cautions; invitation acceptance/decline, email delivery, token/expiry/revocation and member administration remain incomplete.
- Test coverage: inspected the four workspace integration files; none covers member listing or invitation creation. No test command was run for this documentation-only update, and no new result is claimed.
- Ticket: no matching feature ticket or ticket ID was identified in the checked-in documentation.
- No application source code, environment files, dependencies or tests changed.

## 2026-11-16 — Workspace management documentation synchronized
- Updated: README, project context, backend onboarding, PRD/SRS implementation notes, architecture, database schema, API reference, deployment/security documentation, testing strategy, roadmap and developer guide.
- Documented: authenticated workspace create/list/details/update/soft-delete routes, strict request validation, transaction-backed OWNER membership creation, response shapes, membership visibility, OWNER/ADMIN update access and OWNER-only deletion.
- Recorded: Workspace and WorkspaceMember fields/index declarations, soft-delete behavior, four workspace integration test files, and the distinction between implemented management and planned member/invitation/project capabilities.
- Test evidence: developer reports the workspace regression suite passed; it was not independently rerun for this documentation update. The earlier 47-test run covered the nine auth/security files before workspace tests were added; the current 13-file suite is not claimed as passing.
- No application source code, tests, dependencies or configuration changed.

## 2026-11-16 — CSRF, rate-limit and test verification documentation refreshed
- Reconciled README, security, API, architecture, deployment, backend onboarding, test strategy and project context with the current CSRF and rate-limit source.
- Documented the signed double-submit token structure, HMAC-SHA256 refresh-token binding, seven-day expiry, `csrfToken` cookie, `X-CSRF-Token` header, and required `CSRF_SECRET`.
- Documented the 300/15-minute general API limiter and login, registration and refresh limits; clarified that standard `RateLimit-*` headers are enabled and default in-memory counters are not shared across instances.
- Ran `node --test tests/integration/*.test.js` against the user-confirmed disposable test database: 47 passed, 0 failed.
- Remaining test gaps: assertions for rate-limit headers and strict CSRF-cookie clearing path; the current logout controller clears the CSRF cookie at `/api/v1/auth` although it is issued at `/`.

## 2026-11-15 — CSRF and API rate-limit documentation synchronized
- Updated: root/backend onboarding, API reference, architecture, security, testing, deployment, roadmap and project context to match the implemented signed double-submit CSRF mechanism and general API rate limiter.
- Documented: required `CSRF_SECRET` (minimum 32 characters), token HMAC-SHA256 binding/expiry/validation, `csrfToken` cookie and `X-CSRF-Token` header, refresh/logout enforcement, and standard rate-limit headers.
- Added: the missing non-secret `CSRF_SECRET` placeholder to the root `.env.example`; backend `.env.example` already contained a placeholder.
- Flagged: the CSRF cookie is issued at `Path=/` but logout clears it at `/api/v1/auth`; this source-level mismatch remains unfixed.
- Nine test files now exist, including CSRF unit/HTTP and general API rate-limit coverage. Three non-database test files passed (10 tests); the complete DB-backed suite was not run, so no full-suite pass is claimed.

## 2026-11-15 — Session-bound access and workspace slice documented
- Updated: project context, root/backend/frontend onboarding, architecture, database schema, API, security, testing, roadmap and developer guidance to reflect the newer source state.
- Corrected: access JWTs now carry `sid`; protected requests validate the matching active, unexpired database Session, so logout invalidates that device's access tokens while independent device sessions remain active.
- Documented: Workspace/WorkspaceMember schemas, unique slug and compound membership index declarations, strict creation validation, and transactional creation of the workspace plus initial OWNER membership.
- Clarified: workspace creation is not exposed by a route, has no tests, and does not implement RBAC, membership authorization or tenant isolation. Projects/tasks/notifications/chat remain placeholders.
- Added: an 8–10 week private-beta planning estimate based on 2–3 development hours per day, with launch gates and deferred post-beta scope.
- The six integration files were inspected but not run; no test pass is claimed. No application source, tests, package files, environment files or database data were changed.

## 2026-11-15 — Authentication hardening and test documentation synchronized
- Updated: project context, agent guidance, root/backend onboarding, architecture, API, roadmap, testing, deployment, database, security, developer and UI/requirements status notes.
- Corrected: Origin validation and auth rate limiting are implemented; documented guarded routes, limits, in-memory store, proxy configuration gap, and remaining CSRF limitation.
- Catalogued: all six current integration test files and their source-verified coverage; the DB-backed suites were not run for this documentation update.
- Clarified: PRD/SRS/UI documents are approved product requirements and not implementation inventories; only User and Session are currently implemented Mongoose models.
- No application source, package manifest, lockfile or environment file changed. No ticket ID was supplied or identified in the repository.

## 2026-11-14 — Refresh sessions and auth integration tests documented
- Updated: root/backend onboarding, architecture diagrams, active API reference, security/session lifecycle, environment guide, development guide and milestone tracker to match the current workspace source.
- Documented: refresh-cookie attributes, SHA-256 token hashes, Session family IDs, transactional rotation, replay response, conditional updates, logout behavior and access-token revocation limitation.
- Verified in source: Node `node:test` integration cases cover MongoDB commit/rollback and refresh rotation, invalid token, replay, concurrency, suspended user and expired session. These DB tests were not run during the documentation task.
- Added: `docs/14_DEVELOPER_GUIDE.md`; no ADR was added because the implementation follows existing ADR-009.
- Limitation: test suite uses a disposable replica-set MongoDB database; transaction test selects the database from `MONGO_URI`. Do not run it against production/shared data.

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