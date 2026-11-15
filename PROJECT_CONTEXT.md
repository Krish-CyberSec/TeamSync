# TeamSync Project Context

> Concise implementation snapshot; `docs/` is the canonical product and engineering reference.

## Product and approved architecture

TeamSync combines personal productivity with collaboration across multiple workspaces. Target R1 includes private projects, role-specific workspace membership, tasks, comments, project chat, notifications, activity and analytics.

Architecture is a modular monolith: React/Vite/Tailwind CSS v4 frontend; Node.js ES-module/Express backend; MongoDB/Mongoose; Zod validation; bcrypt passwords; JWT access/refresh tokens. The approved token transport is a 10–15 minute access JWT held in memory plus an HttpOnly/Secure refresh cookie with CSRF protection and server-side rotation. Current code uses 15-minute access and seven-day refresh tokens. Workspaces, role authorization and product features remain approved requirements, not implemented functionality.

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
  middleware/rate-limit.middleware.js in-memory auth endpoint limiters
  modules/auth/                  routes, controller, schemas, services, Session
  modules/health/                health route/controller
  modules/users/                  User model
  utils/token.js                 HS256 JWT helpers
  utils/token-hash.js            SHA-256 refresh-token digest
backend/tests/integration/       six transaction, auth service/HTTP and rate-limit test files
frontend/src/                    React/Vite starter and scaffold
docs/                            canonical product and engineering docs
```

## Implemented and checked

- Express uses CORS, Helmet, JSON parsing and cookie-parser, mounts health/auth routers under `/api/v1`, then the error handler.
- Zod validates configuration and strict registration/login inputs. Required JWT secrets are at least 32 characters each; code does not enforce that values differ. `MONGO_URI` is schema-optional but runtime-needed.
- Registration hashes passwords with bcrypt cost 12 and returns a safe DTO. Login checks status/password, creates a Session, returns an access JWT, and sets a refresh cookie.
- Session stores user, family ID, SHA-256 token hash, expiry/revocation/replacement/last-use metadata and timestamps. Rotation checks token/session/user status and conditionally replaces sessions inside a MongoDB transaction; matching replay revokes active sessions in the family.
- Logout attempts to revoke the matching current refresh session and clears the refresh cookie. `GET /auth/me` verifies Bearer access JWT and reloads the active user.
- Registration, login, refresh and logout require an `Origin` matching `new URL(CLIENT_URL).origin`; missing or different origins receive 403. This is a CSRF defense, not authentication, and there is no CSRF token mechanism.
- Login is limited to 5 requests per IP per 15 minutes, registration to 5 per IP per hour, and refresh to 30 per IP per 15 minutes. `express-rate-limit` uses its default in-memory store; no shared store or production proxy trust setting is configured. Logout and `/auth/me` have no configured limiter.
- Active API: `GET /api/v1/health`, `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
- A prior 2026-11-14 check reported `node --check` passing for 16 backend source files and two integration-test files. That predates the additional middleware and HTTP tests below and is not a validation result for the current full tree. The 2026-11-14 smoke check reported health 200; invalid registration/login 400; refresh without cookie 401; logout without cookie 200; `/me` without Bearer 401. No DB-backed auth operation was exercised by that smoke check.

## Test evidence and limitations

Six `node:test` integration files exist: transaction commit/rollback; auth rotation; registration/login HTTP; logout service; logout HTTP; and rate-limit HTTP. Their verified assertions are catalogued in [Testing Strategy](docs/09_TESTING_STRATEGY.md). The MongoDB-backed tests were not run for this documentation update because they write data and require a disposable replica-set database. No `test` script exists. Auth suites select `teamsync_test`; the transaction suite uses the database selected by `MONGO_URI`. Never target production/shared data.

The project owner reports manual Postman/MongoDB checks for registration 201, duplicate email 409, invalid registration 400, bcrypt hash verification, login 200 and invalid credentials 401. These are owner-reported manual checks, not automated coverage and were not repeated here.

MongoDB startup/index creation has not been independently verified. The frontend remains a starter. Auth limitations: no CSRF token mechanism, shared rate-limit store, explicit production proxy trust configuration, email verification, logout-all-devices, or immediate access-token revocation; workspace/resource authorization is also not implemented. Origin validation and SameSite=Lax provide defenses but do not by themselves establish a complete CSRF strategy. The error handler logs full 5xx Error objects; production log redaction needs review. This is not production-ready.

## Important decisions

- Workspace membership belongs in a separate WorkspaceMember collection; unique `{ workspace: 1, user: 1 }`.
- Workspace roles: OWNER, ADMIN, MANAGER, MEMBER. JWT identity is not authorization.
- Projects are private by default; ordinary members need active ProjectMember access.
- Personal tasks are owner-only and non-shareable in R1.
- R1 chat is project-scoped; direct/group messaging and private task/chat attachments are deferred.
- Existing ADRs are in `docs/12_DECISION_LOG.md`; no new architectural decision was made in this milestone.

## Next milestone

Run all six existing integration files against an isolated replica-set database, add `/auth/me` and remaining Origin/error-path coverage, and review production proxy and shared rate-limit storage requirements. Continue auth hardening for logout-all-devices and access-token revocation. Then implement server-side workspace authorization before protected workspace/project APIs and connect the frontend to stable API contracts.

## Last updated

2026-11-15 — Auth/session routes, Origin checks, rate limits, integration-test inventory, onboarding and documentation status synchronized to current workspace source.
