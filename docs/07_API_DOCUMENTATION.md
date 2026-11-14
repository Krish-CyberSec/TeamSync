# API Documentation

**Base path:** `/api/v1`
**Status:** Implemented routes verified against `backend/src/app.js` and auth/health routers (2026-11-14)

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

Requests and responses use JSON except the refresh token, which is carried only by a cookie. There is no global authentication middleware: auth is applied only to `GET /auth/me`; refresh/logout operate on the refresh cookie.

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

`errors` is included for Zod validation failures. The error handler maps Zod and Mongoose validation errors to 400, duplicate-key errors to 409, and hides 5xx messages when `NODE_ENV=production`. The authentication middleware returns its own 401/403 JSON bodies.

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

The cookie is not returned in JSON. The refresh route requires the browser/client to send it. CSRF/Origin protections are not implemented; `SameSite=Lax` and CORS are not substitutes for explicit CSRF protection.

## `GET /api/v1/health`

**Authentication:** None. **Cookie:** Not required.

**Request body:** None.

**Success — 200**

```json
{
  "success": true,
  "message": "TeamSync backend is running"
}
```

## `POST /api/v1/auth/register`

**Authentication:** None. **Cookie:** Not required.

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
| 500 | Unexpected persistence/server error |

The service checks for an existing email before insert; the User model declares a unique email index as a concurrent-insert backstop, assuming the index exists in the database.

## `POST /api/v1/auth/login`

**Authentication:** None. **Cookie:** Not required in request; response sets `refreshToken`.

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
| 500 | Unexpected database/server error |

The distinct 403 account-status response can disclose account state; consider enumeration risk during security hardening.

## `POST /api/v1/auth/refresh`

**Authentication:** No Bearer token. **Cookie:** Valid `refreshToken` cookie required.

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
| 500 | MongoDB/transaction or unexpected server failure |

The session expiry is checked in application code. The TTL index is asynchronous cleanup, not authorization. A MongoDB replica set or sharded deployment is required for transactions.

## `POST /api/v1/auth/logout`

**Authentication:** No Bearer token. **Cookie:** Optional `refreshToken`.

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
| 500 | Database failure while attempting revocation; controller forwards error before clearing the cookie |

Logout does not invalidate already-issued access JWTs. They remain usable until expiry because access-token authentication does not consult the Session collection.

## `GET /api/v1/auth/me`

**Authentication:** `Authorization: Bearer <access-jwt>`. **Cookie:** Not required.

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
      "status": "active"
    }
  }
}
```

| Status | Meaning |
|---:|---|
| 401 | Missing/malformed Authorization header, invalid/expired JWT, invalid subject, or user not found |
| 403 | User account is not active |
| 500 | Database/unexpected error forwarded to central handler |

The middleware verifies signature, issuer, algorithm, expiry and access-token type, validates the user ObjectId, loads the current user, checks active status, and attaches a limited DTO to `req.user`. It does not check session revocation or workspace/project/resource permissions.

## User-reported manual checks

The project owner previously reported Postman/MongoDB checks for registration 201, duplicate email 409, invalid registration 400, password hashing, login 200 and invalid credentials 401. These are owner-reported manual results, not automated coverage and were not repeated during this documentation-only task.

## Planned API

Workspace/membership/invitation, project/member, task/comment, notification, project chat, dashboard, email verification, password reset and logout-all-devices endpoints remain planned. See the [R1 API plan](02_PRD.md) and [roadmap](08_FEATURE_ROADMAP.md). Do not use planned routes as active contracts.
