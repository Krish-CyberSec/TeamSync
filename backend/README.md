# TeamSync backend

The backend is an ES-module Node.js/Express modular monolith. It currently implements public health and auth routes, MongoDB persistence, short-lived access JWTs, HttpOnly refresh cookies, server-side refresh sessions, token rotation, replay-family revocation, bearer authentication for `/me`, and centralized error responses. Workspace authorization and full production security hardening are not implemented.

## Contents

- [Structure](#structure)
- [Request and persistence flow](#request-and-persistence-flow)
- [Dependencies and commands](#dependencies-and-commands)
- [Configuration](#configuration)
- [API](#api)
- [Authentication behavior](#authentication-behavior)
- [Tests and limitations](#tests-and-limitations)

## Structure

```text
backend/
├── src/
│   ├── app.js                         # middleware order and /api/v1 route mounts
│   ├── server.js                      # DB-first startup and signal shutdown
│   ├── config/env.js                  # dotenv + Zod environment validation
│   ├── database/connection.js         # Mongoose connection
│   ├── middleware/
│   │   ├── auth.middleware.js         # Bearer access-token authentication
│   │   ├── error.middleware.js        # API error mapping
│   │   ├── origin.middleware.js       # Trusted-Origin check for auth POST routes
│   │   └── rate-limit.middleware.js   # In-memory login/register/refresh limiters
│   ├── modules/
│   │   ├── auth/                      # routes, controller, validation, service, Session model
│   │   ├── health/                    # health route/controller
│   │   └── users/                     # User model
│   └── utils/
│       ├── token.js                   # JWT sign/verify
│       └── token-hash.js              # SHA-256 refresh-token digest
└── tests/integration/                 # MongoDB transaction and auth rotation tests
```

Routes map HTTP methods/paths. Controllers validate request bodies, call services, set/clear cookies, and construct DTOs. Services implement user credential checks and session workflows. Models persist user/session state. Middleware authenticates bearer requests or converts errors to JSON. Keeping these responsibilities separate makes HTTP behavior and domain/persistence decisions easier to test.

## Request and persistence flow

```mermaid
flowchart LR
  Request["HTTP request"] --> Cors["CORS"]
  Cors --> Helmet["Helmet"]
  Helmet --> Json["JSON parser"]
  Json --> Cookies["cookie-parser"]
  Cookies --> Route["/api/v1 route"]
  Route --> Auth["Bearer auth when required"]
  Auth --> Controller["Controller and Zod schema"]
  Controller --> Service["Auth service"]
  Service --> Models["Mongoose User / Session"]
  Models --> DB[("MongoDB")]
  Controller -. errors via next .-> Error["Central error handler"]
  Error --> Response["JSON response"]
```

The app's order is CORS, Helmet, JSON parsing, cookie parsing, health/auth routers, then the error handler. Login creates a server session before returning the access token and setting the refresh cookie. Refresh changes old/new session documents in a MongoDB transaction. The server awaits MongoDB connection before `listen`; on SIGINT/SIGTERM it closes the HTTP server then the Mongoose connection.

## Dependencies and commands

Runtime dependencies in `package.json`: `bcrypt`, `cookie-parser`, `cors`, `dotenv`, `express`, `helmet`, `jsonwebtoken`, `mongoose`, `zod`. Development dependency: `nodemon`.

| Command | Purpose |
|---|---|
| `npm ci` | Install the lockfile dependencies |
| `npm run dev` | Run `src/server.js` with Nodemon |
| `npm start` | Run `src/server.js` |
| `node --test tests/integration/transaction.test.js tests/integration/auth-rotation.test.js tests/integration/auth-register-login.test.js tests/integration/auth-logout.test.js tests/integration/auth-logout.http.test.js tests/integration/rate-limit.test.js` | Run all six integration test files |

No `test` script is declared. Integration tests require MongoDB transaction support and a dedicated test database.

## Configuration

Run commands in `backend/` so `dotenv/config` loads `backend/.env`. Copy `.env.example` to `.env`; do not commit `.env`.

| Variable | Required? | Validation / behavior |
|---|---|---|
| `NODE_ENV` | No | `development`, `production`, or `test`; default `development` |
| `PORT` | No | Positive integer; default `5000` |
| `MONGO_URI` | Schema-optional, runtime-required | Passed to `mongoose.connect`; no default |
| `JWT_ACCESS_SECRET` | Yes | At least 32 characters |
| `JWT_REFRESH_SECRET` | Yes | At least 32 characters |
| `CLIENT_URL` | No | Valid URL; default `http://localhost:5173` |
| `LOG_LEVEL` | No | Enumerated level; default `info` (not currently used by a logging framework) |

The validator does not ensure the two JWT secret values differ. Generate separate secret values in local/production secret management. `.env.example` values are placeholders, not usable credentials.

## API

All current endpoints are mounted under `/api/v1`.

| Method | Path | Auth | Behavior |
|---|---|---|---|
| GET | `/health` | None | Health response |
| POST | `/auth/register` | None | Strict registration validation; create bcrypt-hashed User |
| POST | `/auth/login` | None | Verify credentials, create Session, set refresh cookie and return access token |
| POST | `/auth/refresh` | Refresh cookie | Verify, transactionally rotate session, return new access token and cookie |
| POST | `/auth/logout` | Optional refresh cookie | Revoke matching active session when possible, clear cookie, return success |
| GET | `/auth/me` | Bearer access token | Load active user and return profile DTO |

See [API reference](../docs/07_API_DOCUMENTATION.md) for request schemas and response/error formats.
Register, login, refresh and logout also require an `Origin` matching `new URL(CLIENT_URL).origin`; missing or mismatched values return 403. This is a CSRF defense, not authentication, and there is no CSRF token mechanism. Login is limited to 5/IP/15 minutes, registration to 5/IP/hour, and refresh to 30/IP/15 minutes. Logout and `/auth/me` have no configured limiter.

## Authentication behavior

- User passwords are bcrypt-hashed (cost 12) in a Mongoose pre-save hook. `passwordHash` is excluded by default; login explicitly selects it and uses `comparePassword`.
- Access JWTs use HS256, issuer `teamsync`, a string `sub`, `tokenType: access`, and a 15-minute expiry.
- Refresh JWTs use the separate refresh secret, issuer/type/subject claims, `sid`, and a seven-day expiry. The browser receives it as an HttpOnly cookie: `SameSite=Lax`, path `/api/v1/auth`, `Secure` only when `NODE_ENV=production`, and seven-day max-age.
- MongoDB stores a SHA-256 digest of the refresh JWT, not the raw token. Sessions track user, family, expiry, revocation, replacement and last-use timestamps. TTL cleanup is asynchronous; rotation explicitly checks `expiresAt`.
- Rotation runs in a MongoDB transaction, conditionally revokes the existing session and creates its replacement in the same family. Reuse of a revoked but otherwise matching token revokes active sessions in the family.
- Logout returns success and clears the cookie even when it is missing/invalid. A database failure is forwarded to error handling before cookie clearing. Logout does not revoke already-issued access JWTs; they can remain valid until expiry.

## Tests and limitations

Six Node built-in integration test files exist. They cover transaction commit/rollback; rotation, invalid JWT, replay-family revocation, concurrent refresh attempts, suspended users and explicit session expiry; registration/login HTTP validation and cookie behavior; logout service and HTTP behavior; and rate-limit thresholds.

The tests were not run during this documentation update. MongoDB-backed tests require a disposable replica-set-capable database. Auth/logout suites select `teamsync_test`, while the transaction test uses the database named in the URI and creates `teamsync_transaction_probe` there. Do not point that URI at production/shared data. There is no dedicated `/auth/me` HTTP test or successful refresh-controller HTTP test.

The rate limiter uses its default in-memory store; counters reset on process restart and are not shared across instances. No production proxy trust policy is configured. A CSRF token mechanism, shared rate-limit storage, logout-all-devices, access-token revocation, and production cookie/security-header review remain outstanding. This is not a claim of production readiness.
