# API Documentation

**Base path:** `/api/v1`
**Status:** Implemented routes and middleware verified against source (2026-11-17)

## Contents

- [Conventions](#conventions)
- [Refresh cookie](#refresh-cookie)
- [Health](#get-apiv1health)
- [Register](#post-apiv1authregister)
- [Login](#post-apiv1authlogin)
- [Refresh](#post-apiv1authrefresh)
- [Logout](#post-apiv1authlogout)
- [Current user](#get-apiv1authme)
- [Workspace management](#workspace-management)
- [List workspace members](#get-apiv1workspacesworkspaceidmembers)
- [Create workspace invitation](#post-apiv1workspacesworkspaceidinvitations)
- [Planned API](#planned-api)

## Conventions

Requests and responses use JSON except the refresh token, which is carried only by a cookie. Authentication is applied per route: Bearer authentication protects `GET /auth/me` and all workspace endpoints; refresh/logout use the refresh cookie. Registration, login, refresh and logout require a trusted `Origin`; workspace creation and invitation creation also require a trusted Origin. Refresh and logout require a valid CSRF cookie/header pair. CORS is configured with `CLIENT_URL` and credentials.

For auth POST routes and workspace creation/invitation POST routes, the accepted Origin is `new URL(CLIENT_URL).origin`. A missing or non-matching `Origin` returns HTTP 403. This check is a CSRF defense, not authentication; CORS alone is not a CSRF defense. `POST /auth/refresh` and `POST /auth/logout` additionally require the signed double-submit CSRF token described below.

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

The general 300-per-15-minute IP limit is applied to every `/api/v1` request. Auth routes also have the stricter route-specific limits below. All limits use `express-rate-limit`'s default in-memory store. Standard headers `RateLimit-Policy`, `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset` are enabled; they report the quota window, request limit, remaining requests and seconds until reset. Legacy `X-RateLimit-*` headers are disabled.

| Route | Limit | Rejection |
|---|---:|---|
| `/api/v1/*` | 300 per 15 minutes | 429, `Too many requests. Please try again later.` |
| `POST /api/v1/auth/login` | 5 per 15 minutes | 429, `Too many login attempts. Please try again later.` |
| `POST /api/v1/auth/register` | 5 per hour | 429, `Too many registration attempts. Please try again later.` |
| `POST /api/v1/auth/refresh` | 30 per 15 minutes | 429, `Too many refresh requests. Please try again later.` |

Logout, `/auth/me`, and health have no route-specific limiter, but are covered by the general API limit. In-memory counters reset when the process restarts and are not shared across backend instances. The application does not configure Express `trust proxy`; deployments behind a reverse proxy must review and explicitly configure trusted proxy hops before relying on client IP rate limits. The auth registration/login integration test sets `trust proxy` to `loopback` for test IPs; that is test-only. Multi-instance production deployments should use a shared store.

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

The cookie is not returned in JSON. The refresh route requires the browser/client to send it.

### CSRF token

Login and successful refresh also issue a browser-readable `csrfToken` cookie. It uses `Path=/`, `SameSite=Lax`, a seven-day max-age, and `Secure` only when `NODE_ENV=production`; it is intentionally not `HttpOnly` so browser code can copy it into the request header. For `POST /api/v1/auth/refresh` and `POST /api/v1/auth/logout`, send the same token in `X-CSRF-Token`. Both routes also require the refresh-token cookie. The `csrfToken` cookie and header must be present and identical, and the token must verify against the presented refresh token; failures return HTTP 403.

The token has timestamp, a nonce generated from 32 random bytes, and signature components. The signature is HMAC-SHA256 using required `CSRF_SECRET` (minimum 32 characters) over the timestamp, nonce and refresh-token value. Verification rejects malformed or future timestamps, tokens older than seven days, and signatures not bound to the current refresh token; signature comparison uses Node's timing-safe comparison. Login signs a token for the newly issued refresh token. Refresh rotates both cookies, binding a new CSRF token to the replacement refresh token; the old CSRF token will not validate with that new refresh token. Registration does not issue either cookie.

The four auth POST endpoints also require the trusted `Origin` described above. Origin validation, the signed double-submit token and `SameSite=Lax` are layered defenses; CORS alone is not CSRF protection.

## `GET /api/v1/health`

**Authentication:** None. **Origin:** Not required. **Rate limit:** 300 requests per IP per 15 minutes (general API limiter). **Cookie:** Not required.

**Request body:** None.

**Success — 200**

```json
{
  "success": true,
  "message": "TeamSync backend is running"
}
```

## `POST /api/v1/auth/register`

**Authentication:** None. **Origin:** Must match the configured trusted Origin. **Rate limit:** 300 requests per IP per 15 minutes plus 5 requests per IP per hour. **Cookie:** Not required.

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

**Authentication:** None. **Origin:** Must match the configured trusted Origin. **Rate limit:** 300 requests per IP per 15 minutes plus 5 requests per IP per 15 minutes. **Cookie:** Not required in request; response sets `refreshToken` and `csrfToken`.

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

**Success — 200** — sets the refresh and CSRF cookies described above and returns the short-lived access token in the response body:

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

**Authentication:** No Bearer token. **Origin:** Must match the configured trusted Origin. **Rate limit:** 300 requests per IP per 15 minutes plus 30 requests per IP per 15 minutes. **Cookies/headers:** Valid `refreshToken` and `csrfToken` cookies, with matching `X-CSRF-Token` header.

**Request headers:** `Origin: <new URL(CLIENT_URL).origin>`, `X-CSRF-Token: <csrfToken-cookie-value>`, and browser/client cookies containing `refreshToken` and `csrfToken`.

**Request body:** None.

**Success — 200** — rotates the current session inside a MongoDB transaction, sets replacement refresh and CSRF cookies, and returns a new access token in a response shape matching login:

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
| 403 | CSRF token is missing, mismatched, invalid, expired or bound to a different refresh token |
| 429 | General API or refresh-specific rate limit exceeded |
| 500 | MongoDB/transaction or unexpected server failure |

The session expiry is checked in application code. The TTL index is asynchronous cleanup, not authorization. A MongoDB replica set or sharded deployment is required for transactions.

## `POST /api/v1/auth/logout`

**Authentication:** No Bearer token. **Origin:** Must match the configured trusted Origin. **Rate limit:** General API limit of 300 requests per IP per 15 minutes; no logout-specific limit. **Cookies/headers:** Valid `refreshToken` and `csrfToken` cookies, with matching `X-CSRF-Token` header.

**Request headers:** `Origin: <new URL(CLIENT_URL).origin>`, `X-CSRF-Token: <csrfToken-cookie-value>`, and browser/client cookies containing `refreshToken` and `csrfToken`.

**Request body:** None.

After the CSRF middleware accepts the cookie/header pair, the service verifies the provided refresh JWT and conditionally revokes only the matching active session by session ID, user ID and token hash. If the service cannot identify an active session, revocation is a no-op and the controller clears the cookies and returns success. A missing refresh cookie or invalid/missing CSRF token is rejected with 403 before the controller runs.

**Success — 200**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Cookie clearing:** The refresh cookie is cleared using its `/api/v1/auth` path. The CSRF cookie is issued at `Path=/`, but the controller clears it at `/api/v1/auth`; this path mismatch may leave the browser-readable CSRF cookie behind and needs correction.

| Status | Meaning |
|---:|---|
| 200 | Cookie cleared; session revoked if a valid matching active session was found |
| 403 | Origin is missing or does not match the configured trusted Origin |
| 403 | CSRF token is missing, mismatched, invalid, expired or not bound to the refresh token |
| 500 | Database failure while attempting revocation; controller forwards error before clearing the cookie |

Access JWTs contain `sid`, the database Session ID used when the token was issued. Logout revokes that session; `authenticate` checks for the exact `(sid, user)` session with `revokedAt: null` and `expiresAt > now`, so the associated access JWT is rejected on the next protected request even if its JWT `exp` has not passed. Other device sessions have different IDs and remain valid. JWT expiry (15 minutes) and database-session expiry (seven days) are separate checks; either can deny access first.

## `GET /api/v1/auth/me`

**Authentication:** `Authorization: Bearer <access-jwt>`. **Origin:** Not required. **Rate limit:** 300 requests per IP per 15 minutes (general API limiter). **Cookie:** Not required.

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

## Workspace management

All seven endpoints below are mounted under `/api/v1/workspaces` and require `Authorization: Bearer <access-jwt>`. They are subject to the general 300-requests-per-IP-per-15-minutes API limit and have no workspace-specific limiter. The access middleware validates the JWT, active user and matching unrevoked, unexpired database Session. Workspace membership is checked separately; a valid JWT alone does not grant workspace access. Workspace creation and update use strict Zod schemas. Invitation input is Zod-validated but its schema is non-strict, so extra body fields are ignored.

### `POST /api/v1/workspaces`

**Authentication:** Bearer access token. **Origin:** Must match `new URL(CLIENT_URL).origin`. **Request body:** Strict JSON object.

| Field | Validation |
|---|---|
| `name` | String, trimmed, 2–80 characters |
| `slug` | String, trimmed and lowercased, 2–80 characters; lowercase letters/digits separated by single hyphens |
| `description` | Optional string, trimmed, maximum 500 characters; defaults to an empty string |

Unknown fields are rejected. The workspace and creator's `OWNER` membership are inserted in one MongoDB transaction.

**Success — 201**

```json
{
  "success": true,
  "message": "Workspace created successfully",
  "data": {
    "workspace": {
      "id": "<workspace-id>",
      "name": "<name>",
      "slug": "<slug>",
      "description": "<description>",
      "createdBy": "<user-id>",
      "createdAt": "<timestamp>"
    }
  }
}
```

| Status | Meaning |
|---:|---|
| 400 | Invalid body or unknown field |
| 401 | Missing/invalid Bearer token, inactive/missing user, or invalid active session (after trusted-Origin validation passes) |
| 403 | Origin is missing or does not match the configured trusted Origin |
| 409 | Duplicate slug (MongoDB duplicate-key error) |
| 429 | General API rate limit exceeded |
| 500 | Unexpected database/server error |

### `GET /api/v1/workspaces`

**Authentication:** Bearer access token. **Request body:** None.

Only workspaces associated with the authenticated user's WorkspaceMember records are returned. Deleted workspaces are excluded. Results are ordered by membership `joinedAt` descending; each workspace includes the caller's `role` and `joinedAt`.

**Success — 200:** `{ "success": true, "message": "Workspaces retrieved successfully", "data": { "workspaces": [...] } }`. Each array item contains `id`, `name`, `slug`, `description`, `createdBy`, `role`, `joinedAt`, `createdAt` and `updatedAt`.

| Status | Meaning |
|---:|---|
| 401 | Missing/invalid Bearer token, inactive/missing user, or invalid active session |
| 429 | General API rate limit exceeded |
| 500 | Unexpected database/server error |

### `GET /api/v1/workspaces/:workspaceId`

**Authentication:** Bearer access token. **Request body:** None.

The caller must be a member of the active workspace. All workspace roles can view it. Non-members and deleted/missing workspaces receive the same 404 response.

**Success — 200:** `{ "success": true, "message": "Workspace retrieved successfully", "data": { "workspace": { ... } } }`. The `workspace` object contains `id`, `name`, `slug`, `description`, `createdBy`, the caller's `role` and `joinedAt`, and `createdAt` and `updatedAt`.

| Status | Meaning |
|---:|---|
| 400 | `workspaceId` is not a valid MongoDB ObjectId |
| 401 | Missing/invalid Bearer token, inactive/missing user, or invalid active session |
| 404 | Workspace is missing, deleted, or caller is not a member |
| 429 | General API rate limit exceeded |
| 500 | Unexpected database/server error |

### `PATCH /api/v1/workspaces/:workspaceId`

**Authentication:** Bearer access token; active workspace membership required. OWNER and ADMIN may update; MANAGER and MEMBER receive 403. **Request body:** Strict JSON object containing at least one of:

| Field | Validation |
|---|---|
| `name` | Optional string, trimmed, 2–80 characters |
| `description` | Optional string, trimmed, maximum 500 characters |

Unknown fields, including `slug`, `createdBy` and `role`, are rejected. Neither the slug nor creator nor membership role is changed by this endpoint.

**Success — 200:** `{ "success": true, "message": "Workspace updated successfully", "data": { "workspace": { ... } } }`. The workspace object contains `id`, `name`, `slug`, `description`, `createdBy`, the caller's `role`, `createdAt` and `updatedAt`.

| Status | Meaning |
|---:|---|
| 400 | Invalid ObjectId, empty body, invalid field value or unexpected field |
| 401 | Missing/invalid Bearer token, inactive/missing user, or invalid active session |
| 403 | Caller is a workspace member but is not OWNER or ADMIN; this role check occurs before checking whether the workspace is active |
| 404 | Workspace is missing/deleted for an OWNER/ADMIN, or caller is not a member |
| 429 | General API rate limit exceeded |
| 500 | Unexpected database/server error |

### `DELETE /api/v1/workspaces/:workspaceId`

**Authentication:** Bearer access token; OWNER role required. **Request body:** None.

Deletion is soft: the workspace status changes to `DELETED` and `deletedAt` is set. The endpoint does not permanently delete the workspace or membership records. ADMIN, MANAGER and MEMBER cannot delete. Deleted workspaces no longer appear in list/details. Repeated deletion by the OWNER returns 404; other member roles are rejected with 403 before active-workspace state is checked. No recovery or permanent purge endpoint is implemented.

**Success — 200:** `{ "success": true, "message": "Workspace deleted successfully" }`.

| Status | Meaning |
|---:|---|
| 400 | `workspaceId` is not a valid MongoDB ObjectId |
| 401 | Missing/invalid Bearer token, inactive/missing user, or invalid active session |
| 403 | Caller is a workspace member but is not OWNER |
| 404 | Workspace is missing/deleted or caller is not a member |
| 429 | General API rate limit exceeded |
| 500 | Unexpected database/server error |

### `GET /api/v1/workspaces/:workspaceId/members`

**Authentication:** Bearer access token; the caller must have an `ACCEPTED` membership in the active workspace. All workspace roles may list accepted members. **Request body:** None.

Pending and declined memberships are not included. The response exposes each accepted member's user ID, name, email, role and `joinedAt`.

**Success — 200**

```json
{
  "success": true,
  "message": "Workspace members retrieved successfully.",
  "data": {
    "members": [
      {
        "userId": "<user-id>",
        "name": "<name>",
        "email": "<email>",
        "role": "MEMBER",
        "joinedAt": "<timestamp>"
      }
    ],
    "total": 1
  }
}
```

| Status | Meaning |
|---:|---|
| 400 | `workspaceId` is not a valid MongoDB ObjectId |
| 401 | Missing/invalid Bearer token, inactive/missing user, or invalid active session |
| 404 | Workspace is missing/deleted or caller does not have an accepted membership |
| 429 | General API rate limit exceeded |
| 500 | Unexpected database/server error |

### `POST /api/v1/workspaces/:workspaceId/invitations`

**Authentication:** Bearer access token and an `ACCEPTED` OWNER or ADMIN membership in the active workspace. **Origin:** Must match `new URL(CLIENT_URL).origin` (the Origin guard runs before Bearer authentication). **Request body:** JSON with a valid registered user's email.

V1 currently supports invitations only for users who already have an account. Zod trims and lowercases the email, validates its format and caps it at 254 characters. The service normalizes it again before lookup. Unknown body properties are ignored. Users cannot invite themselves; an accepted membership or another pending invitation conflicts. An existing declined membership is reused as a new pending invitation rather than creating a second membership row.

New invitations use the existing `WorkspaceMember` record with `role: "MEMBER"`, `status: "PENDING"`, `invitedBy` set to the requester, and `acceptedAt`, `declinedAt` and `joinedAt` set to `null`. The unique `{ workspace, user }` index prevents duplicate rows; if a concurrent insert raises MongoDB error code `11000`, the service rereads the membership and returns the corresponding already-member or pending-invitation conflict.

**Request body**

```json
{
  "email": "member@example.com"
}
```

**Success — 201**

```json
{
  "success": true,
  "message": "Workspace invitation created successfully",
  "data": {
    "invitation": {
      "id": "<workspace-member-id>",
      "email": "member@example.com",
      "status": "PENDING"
    }
  }
}
```

| Status | Response / meaning |
|---:|---|
| 400 | Invalid `workspaceId`, invalid email/body (`"Validation failed"` with Zod issue objects in `errors`), or self-invitation (`"You cannot invite yourself"`) |
| 401 | Missing/invalid Bearer token, inactive/missing user, or invalid active session, provided the trusted-Origin check passes |
| 403 | Origin is missing/untrusted, or requester is not an OWNER/ADMIN (`"Only workspace owners and admins can invite members"`) |
| 404 | Workspace is missing/deleted or requester lacks an accepted membership (`"Workspace not found"`); email does not match a registered user (`"Registered user not found"`) |
| 409 | Existing accepted membership (`"User is already a workspace member"`) or pending invitation (`"An invitation is already pending for this user"`) |
| 429 | General API rate limit exceeded |
| 500 | Unexpected database/server error |

The route/controller handles Origin/auth middleware, ObjectId and body validation, service invocation, and HTTP response mapping. The service owns workspace/role checks, registered-user lookup, self/duplicate checks, declined-row reuse and duplicate-key race handling. Zod validates and normalizes input; `WorkspaceMember` supplies status/role constraints and the unique workspace/user index. No invitation email is sent. There is no acceptance, decline, expiration or revocation endpoint, and the current invitation record has no token or expiry field.

### Implemented workspace role matrix

| Capability | OWNER | ADMIN | MANAGER | MEMBER |
|---|---:|---:|---:|---:|
| View workspace | Yes | Yes | Yes | Yes |
| Update workspace name/description | Yes | Yes | No | No |
| Soft-delete workspace | Yes | No | No | No |
| List accepted workspace members | Yes | Yes | Yes | Yes |
| Create workspace invitation | Yes | Yes | No | No |

This matrix describes only implemented workspace endpoints. Member removal, role management, ownership transfer, invitation acceptance/decline/expiration/revocation, workspace recovery, projects and project/task authorization are not implemented.

## User-reported manual checks

The project owner previously reported Postman/MongoDB checks for registration 201, duplicate email 409, invalid registration 400, password hashing, login 200 and invalid credentials 401. These are owner-reported manual results, not automated coverage and were not repeated during this documentation-only task.

## Planned API

Workspace creation, listing, details, updates, soft deletion, accepted-member listing and invitation creation are active API contracts above. Invitation acceptance/decline, email delivery, expiration/revocation, member removal, role management, ownership transfer, recovery, projects, tasks, comments, notifications, project chat, dashboard, email verification, password reset and logout-all-devices endpoints remain planned. See the [R1 API plan](02_PRD.md) and [roadmap](08_FEATURE_ROADMAP.md). Do not use planned routes as active contracts.
