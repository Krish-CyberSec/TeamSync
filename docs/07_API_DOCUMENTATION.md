# API Documentation

**Base path:** `/api/v1`
**Status:** Implemented routes and auth middleware verified against source (2026-11-15)

## Contents

- [Conventions](#conventions)
- [Refresh cookie](#refresh-cookie)
- [Health](#get-apiv1health)
- [Register](#post-apiv1authregister)
- [Login](#post-apiv1authlogin)
- [Refresh](#post-apiv1authrefresh)
- [Logout](#post-apiv1authlogout)
- [Current user](#get-apiv1authme)
- [Planned API](#planned-api)

## Conventions

Requests and responses use JSON except the refresh token, which is carried only by a cookie. There is no global authentication middleware: Bearer authentication is applied only to `GET /auth/me`; refresh/logout operate on the refresh cookie. Registration, login, refresh and logout also require a trusted `Origin`. CORS is configured with `CLIENT_URL` and credentials.

For these four auth POST routes, the accepted Origin is `new URL(CLIENT_URL).origin`. A missing or non-matching `Origin` returns HTTP 403. This check is a CSRF defense, not authentication; CORS alone is not a CSRF defense. No CSRF token is implemented.

Success responses use:

```json
{
  "success": true,
  "message": "Operation description",
  "data": {}
}
```

Error responses from the centralized handler use:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    { "field": "fieldName", "message": "Validation detail" }
  ]
}
```

`errors` is included for Zod validation failures. The central error handler maps Zod and Mongoose validation errors to 400, duplicate-key errors to 409, and masks 5xx response messages when `NODE_ENV=production` (the current handler still logs the full error object). Authentication, Origin and rate-limit middleware/controllers also return JSON error bodies with `success: false` and `message`.

### Rate limits

The configured limits are IP-based and use `express-rate-limit`'s default in-memory store. Standard rate-limit headers are enabled and legacy headers are disabled.

| Route | Limit | Rejection |
|---|---:|---|
| `POST /api/v1/auth/login` | 5 per 15 minutes | 429, `Too many login attempts. Please try again later.` |
| `POST /api/v1/auth/register` | 5 per hour | 429, `Too many registration attempts. Please try again later.` |
| `POST /api/v1/auth/refresh` | 30 per 15 minutes | 429, `Too many refresh requests. Please try again later.` |

Logout, `/auth/me`, and health have no configured limiter. In-memory counters reset when the process restarts and are not shared across backend instances. The application does not configure Express `trust proxy`; deployments behind a reverse proxy must review and explicitly configure trusted proxy hops before relying on client IP rate limits. The auth registration/login integration test sets `trust proxy` to `loopback` for test IPs; that is test-only.

## Refresh cookie

Login and refresh set a cookie named `refreshToken` with:

| Attribute | Current setting |
|---|---|
| `HttpOnly` | `true` |
| `Secure` | `true` only when `NODE_ENV=production` |
| `SameSite` | `Lax` |
| `Path` | `/api/v1/auth` |
| `Max-Age` | Seven days |
| `Domain` | Not explicitly set |

The cookie is not returned in JSON. The refresh route requires the browser/client to send it. The four auth POST endpoints require the trusted `Origin` described above. Origin validation and `SameSite=Lax` are CSRF defenses, but no CSRF token is implemented; CORS alone is not CSRF protection and the current controls should not be presented as a complete CSRF guarantee.

## `GET /api/v1/health`

**Authentication:** None. **Origin:** Not required. **Rate limit:** None. **Cookie:** Not required.

**Request body:** None.

**Success — 200**

```json
{
  "success": true,
  "message": "TeamSync backend is running"
}
```

## `POST /api/v1/auth/register`

**Authentication:** None. **Origin:** Must match the configured trusted Origin. **Rate limit:** 5 requests per IP per hour. **Cookie:** Not required.

Send `Origin: <new URL(CLIENT_URL).origin>` and `Content-Type: application/json`.

**Request body:** Strict object; unknown fields are rejected.

| Field | Validation |
|---|---|
| `name` | String, trimmed, 2–80 characters |
| `email` | String, trimmed, valid email, normalized to lowercase |
| `password` | String, at least 12 characters and at most 72 UTF-8 bytes |

Example:

```json
{
  "name": "Example User",
  "email": "user@example.test",
  "password": "<local-test-password>"
}
```

**Success — 201**

```json
{
  "success": true,
  "message": "Account registered successfully",
  "data": {
    "user": {
      "id": "<user-id>",
      "name": "Example User",
      "email": "user@example.test",
      "status": "active",
      "createdAt": "<timestamp>"
    }
  }
}
```

The DTO does not include `passwordHash`. Registration does not send email verification.

| Status | Meaning |
|---:|---|
| 400 | Zod validation failure; response includes field issues |
| 409 | Existing email detected by service, or Mongo duplicate-key error |
| 403 | Origin is missing or does not match the configured trusted Origin |
| 429 | Registration rate limit exceeded |
| 500 | Unexpected persistence/server error |

The service checks for an existing email before insert; the User model declares a unique email index as a concurrent-insert backstop, assuming the index exists in the database.

## `POST /api/v1/auth/login`

**Authentication:** None. **Origin:** Must match the configured trusted Origin. **Rate limit:** 5 requests per IP per 15 minutes. **Cookie:** Not required in request; response sets `refreshToken`.

Send `Origin: <new URL(CLIENT_URL).origin>` and `Content-Type: application/json`.

**Request body:** Strict object; unknown fields are rejected.

| Field | Validation |
|---|---|
| `email` | String, trimmed, valid email, normalized to lowercase |
| `password` | Non-empty string, at most 72 UTF-8 bytes |

```json
{
  "email": "user@example.test",
  "password": "<local-test-password>"
}
```

**Success — 200** — sets the refresh cookie described above and returns the short-lived access token in the response body:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "<user-id>",
      "name": "Example User",
      "email": "user@example.test",
      "status": "active"
    },
    "accessToken": "<access-jwt>",
    "tokenType": "Bearer",
    "expiresIn": 900
  }
}
```

The client is expected to keep the access token in memory; do not persist it in local/session storage. The refresh token is not returned in JSON.

| Status | Meaning |
|---:|---|
| 400 | Zod validation failure |
| 401 | Unknown email or incorrect password; generic message |
| 403 | Account exists but is not active; `"Account is unavailable"` |
| 403 | Origin is missing or does not match the configured trusted Origin |
| 429 | Login rate limit exceeded |
| 500 | Unexpected database/server error |

The distinct 403 account-status response can disclose account state; consider enumeration risk during security hardening.

## `POST /api/v1/auth/refresh`

**Authentication:** No Bearer token. **Origin:** Must match the configured trusted Origin. **Rate limit:** 30 requests per IP per 15 minutes. **Cookie:** Valid `refreshToken` cookie required.

**Request headers:** `Origin: <new URL(CLIENT_URL).origin>` and a browser/client cookie containing `refreshToken`.

**Request body:** None.

**Success — 200** — rotates the current session inside a MongoDB transaction, sets a replacement refresh cookie, and returns a new access token in a response shape matching login:

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "user": {
      "id": "<user-id>",
      "name": "Example User",
      "email": "user@example.test",
      "status": "active"
    },
    "accessToken": "<new-access-jwt>",
    "tokenType": "Bearer",
    "expiresIn": 900
  }
}
```

| Status | Meaning |
|---:|---|
| 401 | Missing, invalid, expired or reused refresh token/session |
| 403 | User is missing or not active; active token family is revoked by the service |
| 403 | Origin is missing or does not match the configured trusted Origin |
| 429 | Refresh rate limit exceeded |
| 500 | MongoDB/transaction or unexpected server failure |

The session expiry is checked in application code. The TTL index is asynchronous cleanup, not authorization. A MongoDB replica set or sharded deployment is required for transactions.

## `POST /api/v1/auth/logout`

**Authentication:** No Bearer token. **Origin:** Must match the configured trusted Origin. **Rate limit:** None. **Cookie:** Optional `refreshToken`.

**Request headers:** `Origin: <new URL(CLIENT_URL).origin>`; cookie may be omitted.

**Request body:** None.

The service verifies a provided refresh JWT and conditionally revokes only the matching active session by session ID, user ID and token hash. Missing/malformed/expired tokens cannot identify a session and are treated as no-op revocations. The controller clears the cookie and returns success regardless of whether a session was revoked.

**Success — 200**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Cookie clearing:** Uses matching `HttpOnly`, production `Secure`, `SameSite=Lax`, and `/api/v1/auth` path attributes.

| Status | Meaning |
|---:|---|
| 200 | Cookie cleared; session revoked if a valid matching active session was found |
| 403 | Origin is missing or does not match the configured trusted Origin |
| 500 | Database failure while attempting revocation; controller forwards error before clearing the cookie |

Access JWTs contain `sid`, the database Session ID used when the token was issued. Logout revokes that session; `authenticate` checks for the exact `(sid, user)` session with `revokedAt: null` and `expiresAt > now`, so the associated access JWT is rejected on the next protected request even if its JWT `exp` has not passed. Other device sessions have different IDs and remain valid. JWT expiry (15 minutes) and database-session expiry (seven days) are separate checks; either can deny access first.

## `GET /api/v1/auth/me`

**Authentication:** `Authorization: Bearer <access-jwt>`. **Origin:** Not required. **Rate limit:** None. **Cookie:** Not required.

**Success — 200**

```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "id": "<user-id>",
      "name": "Example User",
      "email": "user@example.test",
      "status": "active",
      "sessionId": "<session-id>"
    }
  }
}
```

| Status | Meaning |
|---:|---|
| 401 | Missing/malformed Authorization header; invalid/expired JWT; invalid subject; user not found; or matching Session missing, revoked or expired |
| 403 | User account is not active |
| 500 | Database/unexpected error forwarded to central handler |

The middleware verifies signature, issuer, algorithm, expiry, access-token type and `sid`; validates the user and session ObjectIds; loads the current active user; then requires the exact matching database Session to exist, be unrevoked and have `expiresAt` in the future. It attaches a limited DTO, including `sessionId`, to `req.user`. The database check makes session revocation effective for access tokens on protected requests. It does not implement workspace/project/resource authorization.

## User-reported manual checks

The project owner previously reported Postman/MongoDB checks for registration 201, duplicate email 409, invalid registration 400, password hashing, login 200 and invalid credentials 401. These are owner-reported manual results, not automated coverage and were not repeated during this documentation-only task.

## Planned API

There is no registered workspace endpoint. Workspace model, validation, creation service and controller files exist, but no workspace routes file is mounted in `app.js`; workspace creation is not an active API contract. Workspace membership administration/RBAC, invitations, project/member, task/comment, notification, project chat, dashboard, email verification, password reset and logout-all-devices endpoints remain planned. See the [R1 API plan](02_PRD.md) and [roadmap](08_FEATURE_ROADMAP.md). Do not use planned routes as active contracts.
