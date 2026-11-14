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
  modules/auth/                  routes, controller, schemas, services, Session
  modules/health/                health route/controller
  modules/users/                  User model
  utils/token.js                 HS256 JWT helpers
  utils/token-hash.js            SHA-256 refresh-token digest
backend/tests/integration/       transaction and refresh rotation tests
frontend/src/                    React/Vite starter and scaffold
docs/                            canonical product and engineering docs
```

## Implemented and checked

- Express uses CORS, Helmet, JSON parsing and cookie-parser, mounts health/auth routers under `/api/v1`, then the error handler.
- Zod validates configuration and strict registration/login inputs. Required JWT secrets are at least 32 characters each; code does not enforce that values differ. `MONGO_URI` is schema-optional but runtime-needed.
- Registration hashes passwords with bcrypt cost 12 and returns a safe DTO. Login checks status/password, creates a Session, returns an access JWT, and sets a refresh cookie.
- Session stores user, family ID, SHA-256 token hash, expiry/revocation/replacement/last-use metadata and timestamps. Rotation checks token/session/user status and conditionally replaces sessions inside a MongoDB transaction; matching replay revokes active sessions in the family.
- Logout attempts to revoke the matching current refresh session and clears the refresh cookie. `GET /auth/me` verifies Bearer access JWT and reloads the active user.
- Active API: `GET /api/v1/health`, `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
- `node --check` passed for 16 backend source files and two integration-test files. Current smoke check: health 200; invalid registration/login 400; refresh without cookie 401; logout without cookie 200; `/me` without Bearer 401. No DB-backed auth operation was exercised by that smoke check.

## Test evidence and limitations

Two MongoDB `node:test` integration files exist. The transaction suite checks commit/rollback. The auth suite checks valid rotation, invalid JWT, replay, concurrency, suspended user and expired DB session. The tests were not run during this documentation task because they perform database writes and require a disposable replica-set DB. No `test` script exists. The transaction suite uses the DB selected by `MONGO_URI`; never target production/shared data.

The project owner reports manual Postman/MongoDB checks for registration 201, duplicate email 409, invalid registration 400, bcrypt hash verification, login 200 and invalid credentials 401. These are owner-reported manual checks, not automated coverage and were not repeated here.

MongoDB startup/index creation has not been independently verified. The frontend remains a starter. Auth limitations: no CSRF/Origin controls, auth rate limits, email verification, logout-all-devices, immediate access-token revocation or workspace/resource authorization. The error handler logs full 5xx Error objects; production log redaction needs review. This is not production-ready.

## Important decisions

- Workspace membership belongs in a separate WorkspaceMember collection; unique `{ workspace: 1, user: 1 }`.
- Workspace roles: OWNER, ADMIN, MANAGER, MEMBER. JWT identity is not authorization.
- Projects are private by default; ordinary members need active ProjectMember access.
- Personal tasks are owner-only and non-shareable in R1.
- R1 chat is project-scoped; direct/group messaging and private task/chat attachments are deferred.
- Existing ADRs are in `docs/12_DECISION_LOG.md`; no new architectural decision was made in this milestone.

## Next milestone

Run the existing transaction/auth integration tests against an isolated replica-set database and add HTTP endpoint/cookie/logout/auth-middleware tests. Complete CSRF/Origin controls, auth rate limiting, logout-all-devices and access-token revocation design. Then implement server-side workspace authorization before protected workspace/project APIs and connect the frontend to stable API contracts.

## Last updated

2026-11-14 — Auth/session routes, transaction tests, onboarding and documentation status synchronized to current workspace source.
