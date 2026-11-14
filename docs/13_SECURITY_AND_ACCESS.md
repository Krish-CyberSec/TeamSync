# Security and Access Model

**Approved R1 baseline:** 2026-11-13
**Implementation review:** 2026-11-14

## Contents

- [Security posture](#security-posture)
- [Implemented identity controls](#implemented-identity-controls)
- [JWT and browser token transport](#jwt-and-browser-token-transport)
- [Server-side sessions](#server-side-sessions)
- [Refresh rotation and replay detection](#refresh-rotation-and-replay-detection)
- [Concurrency and transaction behavior](#concurrency-and-transaction-behavior)
- [Logout behavior](#logout-behavior)
- [Authorization model](#authorization-model)
- [Limitations and hardening](#limitations-and-hardening)

## Security posture

The backend now contains a working auth/session foundation, not a fully hardened authentication or authorization system. Registration, login, refresh, single-device logout and `/auth/me` routes exist. CSRF/Origin controls, rate limiting, email verification, logout-all-devices, immediate access-token revocation and workspace/project authorization do not.

| Control | Current state |
|---|---|
| Strict Zod registration/login schemas | Implemented |
| bcrypt password hashing and comparison | Implemented |
| Safe user response DTOs | Implemented |
| HS256 access/refresh JWT verification | Implemented |
| Refresh JWT stored as SHA-256 hash in Session | Implemented |
| Refresh rotation, family replay response, DB transaction | Implemented; integration tests exist but were not run for this doc task |
| Bearer auth on `/auth/me` | Implemented; not checked against a session/revocation list |
| CSRF and explicit Origin validation | Not implemented |
| Authentication rate limits | Not implemented |
| Workspace/project/resource authorization | Not implemented |
| Automated logout, middleware and HTTP endpoint tests | Not implemented |

## Implemented identity controls

### User model

The `User` model stores name, normalized unique email, `passwordHash` (`select: false`), status (`active`, `suspended`, `deleted`) and Mongoose timestamps. Email is trimmed/lowercased and regex-validated; schema declares the email unique. A pre-save hook hashes changed password values with bcrypt cost 12. `comparePassword` calls `bcrypt.compare`.

Registration Zod validation requires a trimmed 2–80 character name, valid normalized email and password of at least 12 characters and no more than 72 UTF-8 bytes. Unknown fields are rejected. Login validation requires normalized email and a non-empty password capped at 72 UTF-8 bytes. Registration checks email before insert; MongoDB's unique index declaration is the concurrent-write backstop when that index is present in the database.

Login explicitly selects `+passwordHash`, checks that the account is active, compares the password, creates a Session, then returns a DTO and tokens. Unknown email and wrong password share HTTP 401 and the same message. A non-active account receives HTTP 403, which can expose account status.

Password hashes are not returned in auth DTOs. Email verification is not implemented, so registration immediately creates an `active` user.

### Access-token authentication

`authenticate` reads `Authorization: Bearer <token>`, verifies JWT signature/expiry/issuer/algorithm/token type, checks `sub` is a valid MongoDB ObjectId, loads the current user, rejects missing users with 401 and inactive users with 403, then attaches a limited `req.user` DTO. It is currently applied to `GET /api/v1/auth/me`.

The access token has `tokenType: "access"`, issuer `teamsync`, a string `sub`, HS256 signature and 15-minute expiry. It has no `sid` claim, and the middleware does not query Session state. Therefore logout/revocation does not immediately invalidate an already-issued access token; the token may remain accepted until expiration, unless the user is deleted/suspended.

## JWT and browser token transport

`backend/src/utils/token.js` uses `jsonwebtoken` and explicitly pins `HS256` both when signing and verifying. It uses `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` separately; each is Zod-required with at least 32 characters, but the schema does not enforce distinct values.

| Token | Claims | Lifetime | Transport |
|---|---|---:|---|
| Access | `iss: teamsync`, `sub`, `tokenType: access` | 15 minutes | Login/refresh JSON response; client should keep in memory |
| Refresh | `iss: teamsync`, `sub`, `tokenType: refresh`, `sid` | 7 days | `HttpOnly` cookie; never returned in JSON |

The refresh cookie currently sets `HttpOnly`, `SameSite=Lax`, path `/api/v1/auth`, seven-day max-age, and `Secure` only when `NODE_ENV=production`; no `Domain` is configured. This must be reviewed against actual HTTPS, deployment topology, and cross-site frontend/API origins before production.

## Server-side sessions

The `Session` Mongoose schema stores:

| Field | Role |
|---|---|
| `user` | Required reference to User; indexed |
| `familyId` | Required ObjectId identifying a refresh-token lineage; indexed |
| `tokenHash` | Required unique SHA-256 digest; hidden by default |
| `expiresAt` | Required explicit session expiry; TTL-indexed |
| `revokedAt` | Nullable revocation time |
| `replacedBySession` | Nullable reference to replacement Session |
| `lastUsedAt` | Nullable last successful rotation time |
| `createdAt`, `updatedAt` | Mongoose timestamps |

New login creates a Session ID and uses the same ID as initial `familyId`. The service signs a refresh JWT containing that ID as `sid`, computes SHA-256 over the full token string, and stores the digest. The raw refresh token is only sent in the cookie.

The raw token is not stored in MongoDB because a database read or backup exposure should not directly yield a reusable bearer credential. The digest supports equality matching against a presented token while preventing recovery of the original token from the stored value. Refresh JWTs are signed and high-entropy; still, session security depends on protecting signing secrets, transport and database access.

MongoDB's TTL index asynchronously deletes expired documents. TTL deletion is housekeeping, not authorization: refresh rotation also checks `expiresAt` directly.

## Refresh rotation and replay detection

```mermaid
sequenceDiagram
  participant C as Client
  participant R as POST /auth/refresh
  participant J as JWT verifier
  participant TX as MongoDB transaction
  participant S as Session collection
  participant U as User collection
  C->>R: Send HttpOnly refreshToken cookie
  R->>J: Verify signature, issuer, expiry, type
  J-->>R: sub + sid
  R->>R: Validate user/session ObjectId syntax
  R->>TX: Start transaction
  TX->>S: Load session by sid + sub; select tokenHash
  TX->>TX: Compare SHA-256(presented token) with stored hash
  TX->>TX: Check explicit expiry and revokedAt
  TX->>U: Load user and require active status
  TX->>S: Conditionally revoke/claim old session
  TX->>S: Create replacement with same familyId and new token hash
  TX-->>R: Commit transaction
  R-->>C: New access JWT + replacement HttpOnly cookie
```

In the service, invalid JWT/IDs are rejected before database use. The transaction loads the session by `sid` and `sub`, selects the hidden hash, compares SHA-256, checks explicit expiry and revocation, then checks the user status. It conditionally claims the current session (`revokedAt: null`, matching hash, unexpired) and creates a replacement Session with the same `familyId`, a new `sid`, a new token hash, and a fresh seven-day expiry. The controller returns a new access JWT and sets the replacement cookie only on successful service completion.

### Replay detection and family revocation

Refresh-token replay means presenting a refresh credential again after it has already been consumed/rotated. A revoked Session whose stored token hash still matches a valid presented token is treated as reuse. The service marks all active sessions with that `familyId` revoked, then returns 401. The `familyId` is deliberately unchanged: it is the grouping key needed to identify all descendants to revoke, not a status field.

An expired session is rejected before the replay branch; expired records may also be removed asynchronously by TTL cleanup. A missing Session or mismatched hash is rejected without using its family ID. If the account is unavailable, the service revokes active sessions in that family and returns 403.

## Concurrency and transaction behavior

Two concurrent refresh requests can present the same still-active token. Without coordination, each could create a separate active descendant. The service performs the session read, conditional old-session update and replacement insert inside `withTransaction`; the conditional update permits only a session whose hash matches, is not revoked, and has not expired to be claimed. The old-session update and replacement insert commit atomically.

Transactions may retry their callback after transient conflicts; the service resets its outcome state at the beginning of each callback attempt. If a competing refresh wins, a retried request observes the revoked token and follows replay handling, which revokes the family. The expected behavior is one initially successful response, one rejected request, and no active session in that family afterward; the first response's replacement may therefore already be revoked and the client may need to authenticate again.

MongoDB transactions require a replica set or sharded deployment. Tests should use an isolated disposable test database, not a production/shared URI.

## Logout behavior

`POST /api/v1/auth/logout` is a single-device logout and does not require an access Bearer token. The controller reads the parsed `refreshToken` cookie. The service verifies the refresh JWT, validates `sub`/`sid`, hashes the raw cookie, then conditionally updates only the matching active Session (`_id`, user, token hash and `revokedAt: null`) with a revocation timestamp.

- If the cookie is missing, malformed, expired or cannot identify a valid active session, service returns false/no-op; controller still clears the cookie and returns HTTP 200.
- On a matching session, it is revoked, then the cookie is cleared with the same path/security attributes and HTTP 200 is returned.
- If MongoDB fails during revocation, the error is forwarded before cookie clearing; the client may receive a 5xx and the cookie is not explicitly cleared by this handler.
- Logout does **not** revoke already-issued access JWTs. Bearer middleware does not consult sessions, so an access token can remain valid until its 15-minute expiration.
- Logout-all-devices and access-token revocation are not implemented.

## Authorization model

Authorization must follow verified identity → active WorkspaceMember → workspace permission → ProjectMember/project policy → resource ownership/assignment. Roles are `OWNER`, `ADMIN`, `MANAGER`, `MEMBER`; ordinary project access requires ProjectMember; personal tasks are owner-only. These are approved requirements, not implemented workspace/project endpoints or middleware. A valid JWT proves identity only.

## Limitations and hardening

| Area | Current limitation | Follow-up |
|---|---|---|
| CSRF / Origin | No CSRF token validation or explicit Origin check on cookie-authenticated refresh/logout | Define and test a CSRF and trusted-Origin strategy; CORS alone is not protection |
| Rate limiting | Auth endpoints have no rate limiting | Add registration/login/refresh abuse controls |
| Account enumeration | Duplicate registration is 409; inactive account is 403 | Review response policy and test enumeration behavior |
| Access revocation | Access JWT has no session link and is accepted until expiry | Decide whether short expiry is sufficient or add a revocation strategy |
| Logout | Only current refresh session is revoked | Add logout-all-devices and tests |
| Cookie deployment | `Secure` depends only on `NODE_ENV`; `SameSite=Lax` and cross-origin behavior need deployment review | Test exact production frontend/API origins, TLS termination and cookie scope |
| Security headers | Helmet is enabled with defaults; policies not reviewed for product assets | Review CSP and deployment headers before release |
| Logs | Error handler logs full 5xx Error objects; startup/DB failures log error messages | Redact and validate production log fields |
| Verification | Integration tests exist but were not run here; no logout/auth middleware endpoint tests | Run tests against isolated replica-set DB and expand failure/concurrency coverage |
| Authorization | No workspace/project/resource checks | Implement server-side policies before adding protected product routes |

Do not treat the current implementation as production-ready. See the [API reference](07_API_DOCUMENTATION.md), [testing strategy](09_TESTING_STRATEGY.md), and [roadmap](08_FEATURE_ROADMAP.md).
