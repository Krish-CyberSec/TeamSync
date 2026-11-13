# API Documentation

> R1 baseline frozen 2026-11-13. This document distinguishes active routes from planned contracts. The examples describe response shapes and do not contain real credentials or tokens.

## Conventions and current error handling

Base path: `/api/v1`. Requests and responses use JSON. All currently implemented routes are public; no auth middleware is mounted.

Success responses use `{ "success": true, "message": "...", "data": ... }` where applicable. Errors use `{ "success": false, "message": "...", "errors": [...] }`; `errors` is included for Zod issues and contains `{ "field", "message" }` entries. The handler maps Zod and Mongoose validation errors to 400, MongoDB duplicate-key errors to 409, and hides 5xx response messages in production. It logs full 5xx Error objects to the server console.

## Implemented endpoints (verified 2026-11-14)

### `GET /api/v1/health`

- Authentication: none.
- Request body: none.
- Success: HTTP 200.

```json
{
  "success": true,
  "message": "TeamSync backend is running"
}
```

### `POST /api/v1/auth/register`

- Authentication: none.
- Request: strict JSON object; additional properties are rejected.

| Field | Validation |
|---|---|
| `name` | String, trimmed, 2–80 characters |
| `email` | String, trimmed, valid email, normalized to lowercase |
| `password` | String, minimum 12 characters, maximum 72 UTF-8 bytes |

- Success: HTTP 201. The controller returns a safe user DTO; the password/hash is not returned.

```json
{
  "success": true,
  "message": "Account registered successfully",
  "data": {
    "user": {
      "id": "<user-id>",
      "name": "<name>",
      "email": "<normalized-email>",
      "status": "active",
      "createdAt": "<timestamp>"
    }
  }
}
```

- Validation failure: HTTP 400, `message: "Validation failed"` plus `errors`.
- Duplicate email: HTTP 409. The service pre-check returns `"Email is already registered"`; a concurrent duplicate rejected by MongoDB's unique index (once that index has been built) is mapped to a generic duplicate-record message.
- No verification email or token/session is issued.

### `POST /api/v1/auth/login`

- Authentication: none.
- Request: strict JSON object; additional properties are rejected.

| Field | Validation |
|---|---|
| `email` | String, trimmed, valid email, normalized to lowercase |
| `password` | Non-empty string, maximum 72 UTF-8 bytes |

- Success: HTTP 200 with a safe user DTO. No JWT or session cookie is returned.

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "<user-id>",
      "name": "<name>",
      "email": "<normalized-email>",
      "status": "active"
    }
  }
}
```

- Validation failure: HTTP 400 with `message: "Validation failed"` and field errors.
- Invalid email/password: HTTP 401 with generic `"Invalid email or password"`.
- Non-active account (`suspended` or `deleted`): HTTP 403 with `"Account is unavailable"`. This distinct response can disclose account status.
- The service explicitly selects `+passwordHash`, checks status, then calls the User model's bcrypt comparison method.

## User-reported manual Postman results

The project owner reports manually testing the following outcomes; these are not automated tests and were not independently repeated during this documentation update.

| Scenario | Reported result |
|---|---:|
| Registration | 201 |
| Duplicate email | 409 |
| Invalid registration input | 400 |
| Password hashing | Verified in MongoDB |
| Login | 200 |
| Invalid credentials | 401 |

## Token and session primitives (not yet a login/refresh API)

`backend/src/utils/token.js` implements HS256 access/refresh signing and verification. Tokens use issuer `teamsync`, a string `sub`, and a `tokenType`; access tokens expire after 15 minutes, refresh tokens after seven days and include a `sid` session ID. Separate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` variables are used and are each required by env validation to be at least 32 characters. The config does not enforce that their values differ. Verification restricts the algorithm and issuer and checks token type/required claims.

`backend/src/modules/auth/session.model.js` declares session persistence fields and indexes. The helpers and model are not integrated into login. No endpoint currently creates a session, issues a refresh token, rotates tokens, checks session revocation, logs out, or revokes sessions.

## Planned endpoint groups

The following are approved/planned API contracts, not implemented routes:

- Auth/session: POST `/auth/logout`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`; GET `/auth/me`.
- Users: GET/PATCH `/users/me`; GET `/users/me/sessions`; DELETE `/users/me/sessions/:sessionId`; DELETE `/users/me`.
- Workspaces and invitations: `/workspaces`, `/workspaces/:id`, `/workspaces/:id/invitations`, `/invitations/:token/accept`, and member management endpoints.
- Projects and members: `/workspaces/:workspaceId/projects`, `/projects/:id`, and `/projects/:id/members`.
- Tasks/comments: project and personal task endpoints, task status, and task comment endpoints.
- Notifications: `/notifications` and read-state endpoints.
- Project chat: `/projects/:projectId/conversation/messages`.
- Dashboard: `/dashboard/me` and `/dashboard/workspace/:id`.

Every future protected endpoint must document identity, workspace/project authorization, resource ownership, validation, side effects, errors, pagination and tests. Client visibility is not an authorization boundary.
