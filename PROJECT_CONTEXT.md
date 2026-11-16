# TeamSync Project Context

> Concise implementation snapshot; `docs/` is the canonical product and engineering reference.

## Product and approved architecture

TeamSync combines personal productivity with collaboration across multiple workspaces. Target R1 includes private projects, role-specific workspace membership, tasks, comments, project chat, notifications, activity and analytics.

Architecture is a modular monolith: React/Vite/Tailwind CSS v4 frontend; Node.js ES-module/Express backend; MongoDB/Mongoose; Zod validation; bcrypt passwords; JWT access/refresh tokens. Current access JWTs last 15 minutes and are bound to a MongoDB session ID; refresh tokens last seven days in an HttpOnly/Secure-in-production cookie with server-side rotation. Auth POST routes use trusted-Origin validation; refresh/logout also require a signed double-submit CSRF token bound to the refresh token. Workspace create/list/details/update/soft-delete routes are implemented with membership visibility and limited role checks. Member administration and other product features remain unimplemented.

Frontend libraries React Router, TanStack Query, Zustand, Axios and Lucide React are declared/selected but not integrated. Socket.IO remains planned.

## Current backend structure

```text
backend/src/
  app.js                         Express middleware and /api/v1 route mounts
  server.js                      MongoDB-first startup and signal shutdown
  config/env.js                  dotenv + Zod environment validation
  database/connection.js         Mongoose connection
  middleware/auth.middleware.js  Bearer access-token authentication
  middleware/error.middleware.js centralized JSON error mapping
  middleware/origin.middleware.js exact trusted-Origin check for auth POST routes
  middleware/csrf.middleware.js    signed double-submit CSRF checks on refresh/logout
  middleware/rate-limit.middleware.js in-memory general API and auth endpoint limiters
  modules/auth/                  routes, controller, schemas, services, Session
  modules/health/                health route/controller
  modules/users/                  User model
  modules/workspaces/             authenticated routes, controller/service, validation and Workspace/WorkspaceMember models
  utils/token.js                 HS256 JWT helpers
  utils/csrf-token.js            HMAC-SHA256 CSRF-token generation/verification
  utils/token-hash.js            SHA-256 refresh-token digest
backend/tests/integration/       nine auth/security/transaction files and four workspace files
frontend/src/                    React/Vite starter and scaffold
docs/                            canonical product and engineering docs
```

## Implemented and checked

- Express uses CORS, Helmet, JSON parsing and cookie-parser, applies the general `/api/v1` limiter, mounts health/auth/workspace routers, then the error handler.
- Zod validates configuration and strict registration/login inputs. `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` and `CSRF_SECRET` are required and at least 32 characters; code does not enforce that values differ. `MONGO_URI` is schema-optional but runtime-needed.
- Registration hashes passwords with bcrypt cost 12 and returns a safe DTO. Login checks status/password, creates a Session, returns an access JWT, and sets a refresh cookie.
- Session stores user, family ID, SHA-256 token hash, expiry/revocation/replacement/last-use metadata and timestamps. Rotation checks token/session/user status and conditionally replaces sessions inside a MongoDB transaction; matching replay revokes active sessions in the family.
- Access JWTs include `sid` for the database session. `GET /auth/me` verifies JWT claims, active user status, and that exact session is present, unrevoked, and unexpired. Logout revokes the matching session, so associated access JWTs stop authorizing requests immediately; a separate device session remains valid.
- Workspace API includes authenticated create/list/details/update/soft-delete routes. Creation strictly validates name, slug and description, and transactionally creates the workspace plus creator's OWNER membership. Listing/details are membership-scoped; OWNER/ADMIN may update name/description; only OWNER may soft-delete. Deleted workspaces are excluded from listing/details and cannot be mutated. Member listing/removal, invitations, role management, ownership transfer, recovery and permanent deletion are not implemented.
- Registration, login, refresh and logout require an `Origin` matching `new URL(CLIENT_URL).origin`; refresh and logout also require a valid CSRF cookie/header pair. CSRF tokens use HMAC-SHA256 with `CSRF_SECRET`, expire after seven days, and are bound to the refresh token.
- The general limiter allows 300 requests per IP per 15 minutes across `/api/v1`; route-specific limits are login 5/15m, registration 5/hour, refresh 30/15m. `express-rate-limit` uses default in-memory stores and standard `RateLimit-*` headers; no shared store or production proxy trust setting is configured. Logout and `/auth/me` have no route-specific limiter.
- Active API: health and auth routes plus `POST/GET /api/v1/workspaces`, `GET/PATCH/DELETE /api/v1/workspaces/:workspaceId`.
- Four workspace integration files cover creation/listing, detail access, updates and deletion. The developer reports the workspace regression suite passed; this documentation update did not independently rerun it. An earlier nine-file auth/security run passed 47 tests before the workspace files were added; the current full 13-file suite has not been reported as rerun.

## Test evidence and limitations

Thirteen `node:test` integration files exist: nine transaction/auth/security files and four workspace files. Their source assertions are catalogued in [Testing Strategy](docs/09_TESTING_STRATEGY.md). The earlier 47-test run covered the nine auth/security files only; the developer reports the workspace regression suite passed, but the current 13-file suite was not independently rerun. MongoDB-backed tests write data and require a disposable replica-set database. No `test` script exists. Auth suites select `teamsync_test`; the transaction suite uses the database selected by `MONGO_URI`. Never target production/shared data.

The project owner reports manual Postman/MongoDB checks for registration 201, duplicate email 409, invalid registration 400, bcrypt hash verification, login 200 and invalid credentials 401. These are owner-reported manual checks, not automated coverage and were not repeated here.

MongoDB startup/index creation has not been independently verified. The frontend remains a starter. Auth limitations: default in-memory rate-limit stores, no explicit production proxy trust configuration, email verification, or logout-all-devices. The CSRF cookie is issued at `Path=/` but the logout controller clears at `/api/v1/auth`; browsers may retain it. Session revocation is checked during Bearer authentication, but access JWTs remain subject to their own 15-minute expiry and database availability. Workspace role checks cover only implemented management routes; member administration and project/resource authorization and isolation are not implemented. The error handler logs full 5xx Error objects; production log redaction needs review. This is not production-ready.

## Important decisions

- Workspace membership belongs in a separate WorkspaceMember collection; unique `{ workspace: 1, user: 1 }`.
- Workspace roles: OWNER, ADMIN, MANAGER, MEMBER. JWT identity is not authorization.
- Projects are private by default; ordinary members need active ProjectMember access.
- Personal tasks are owner-only and non-shareable in R1.
- R1 chat is project-scoped; direct/group messaging and private task/chat attachments are deferred.
- Existing ADRs are in `docs/12_DECISION_LOG.md`; no new architectural decision was made in this milestone.

## Next milestone

Run the current 13-file integration suite against an isolated replica-set database and record the result. Add workspace member/invitation/role workflows, then implement project/task access control and cross-workspace resource tests. Fix the CSRF-cookie clearing path mismatch. Continue with core collaboration features, frontend integration, end-to-end/security testing, and private-beta deployment. The estimated beta window is 8–10 weeks at approximately 2–3 hours/day and is a planning estimate, not a commitment.

## Last updated

2026-11-16 — Workspace management routes, membership/role checks, soft deletion, schemas, API contracts, test inventory and roadmap synchronized to source.
