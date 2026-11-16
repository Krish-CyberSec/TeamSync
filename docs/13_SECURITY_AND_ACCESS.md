# Security and Access Model

**Approved R1 baseline:** 2026-11-13
**Implementation review:** 2026-11-16

## Contents

- [Security posture](#security-posture)
- [Implemented identity controls](#implemented-identity-controls)
- [JWT and browser token transport](#jwt-and-browser-token-transport)
- [CSRF, Origin validation and rate limiting](#csrf-origin-validation-and-rate-limiting)
- [Server-side sessions](#server-side-sessions)
- [Refresh rotation and replay detection](#refresh-rotation-and-replay-detection)
- [Concurrency and transaction behavior](#concurrency-and-transaction-behavior)
- [Logout behavior](#logout-behavior)
- [Authorization model](#authorization-model)
- [Limitations and hardening](#limitations-and-hardening)

## Security posture

The backend contains a working auth/session foundation, but it is not a fully hardened authentication or authorization system. Registration, login, refresh, single-device logout and `/auth/me` routes exist. Access JWTs are bound to database sessions and the Bearer middleware checks that session on protected requests, so revocation and database-session expiry take effect before JWT expiry. Trusted-Origin checks protect the four auth POST routes; a signed double-submit CSRF token is additionally required on refresh and logout. General and route-specific IP rate limits are active with default in-memory stores. Shared rate-limit storage, explicit production proxy trust, email verification, logout-all-devices and workspace/project authorization remain unimplemented. Logout currently clears the CSRF cookie with a path different from its issue path.

| Control | Current state |
|---|---|
| Strict Zod registration/login schemas | Implemented |
| bcrypt password hashing and comparison | Implemented |
| Safe user response DTOs | Implemented |
| HS256 access/refresh JWT verification | Implemented |
| Refresh JWT stored as SHA-256 hash in Session | Implemented |
| Refresh rotation, family replay response, DB transaction | Implemented; integration tests exist but were not run for this doc task |
| Bearer auth on `/auth/me` | Implemented; verifies matching user/session, revocation and database expiry |
| Signed double-submit CSRF token | Implemented on refresh/logout; HMAC-SHA256 signature is bound to the refresh token and verified with timing-safe comparison |
| Origin validation | Implemented on register/login/refresh/logout; missing/mismatched Origin returns 403 |
| API/auth rate limits | Implemented: API 300/15m, login 5/15m, registration 5/hour, refresh 30/15m; default in-memory stores |
| Production proxy trust configuration | Not configured in the app |
| Workspace/project/resource authorization | Not implemented |
| Automated auth/CSRF/rate-limit tests | Nine integration files; full command passed 47 tests on 2026-11-16 against the configured disposable test database. Rate-limit response headers are enabled in code but are not asserted by the rate-limit tests. |

## Implemented identity controls

### User model

The `User` model stores name, normalized unique email, `passwordHash` (`select: false`), status (`active`, `suspended`, `deleted`) and Mongoose timestamps. Email is trimmed/lowercased and regex-validated; schema declares the email unique. A pre-save hook hashes changed password values with bcrypt cost 12. `comparePassword` calls `bcrypt.compare`.

Registration Zod validation requires a trimmed 2–80 character name, valid normalized email and password of at least 12 characters and no more than 72 UTF-8 bytes. Unknown fields are rejected. Login validation requires normalized email and a non-empty password capped at 72 UTF-8 bytes. Registration checks email before insert; MongoDB's unique index declaration is the concurrent-write backstop when that index is present in the database.

Login explicitly selects `+passwordHash`, checks that the account is active, compares the password, creates a Session, then returns a DTO and tokens. Unknown email and wrong password share HTTP 401 and the same message. A non-active account receives HTTP 403, which can expose account status.

Password hashes are not returned in auth DTOs. Email verification is not implemented, so registration immediately creates an `active` user.

### Access-token authentication

`authenticate` reads `Authorization: Bearer <token>`, verifies JWT signature/expiry/issuer/algorithm/token type, validates both `sub` and `sid` as MongoDB ObjectIds, loads the current user, rejects missing users with 401 and inactive users with 403, then requires the exact Session (`_id: sid`, `user: sub`) to exist with `revokedAt: null` and `expiresAt > now`. Missing, revoked or expired sessions receive 401. It attaches a limited `req.user` DTO that includes `sessionId`. It is currently applied to `GET /api/v1/auth/me`.

The access token has `tokenType: "access"`, issuer `teamsync`, string `sub`, `sid`, HS256 signature and 15-minute expiry. Login binds `sid` to the created Session ID; refresh binds it to the replacement Session ID. Each protected request checks that exact session in MongoDB. A signed JWT can therefore still be within its JWT validity window but be unauthorized because its database session was revoked, deleted or expired.

## JWT and browser token transport

`backend/src/utils/token.js` uses `jsonwebtoken` and explicitly pins `HS256` both when signing and verifying. It uses `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` separately; each is Zod-required with at least 32 characters, but the schema does not enforce distinct values.

| Token | Claims | Lifetime | Transport |
|---|---|---:|---|
| Access | `iss: teamsync`, `sub`, `sid`, `tokenType: access` | 15 minutes | Login/refresh JSON response; client should keep in memory |
| Refresh | `iss: teamsync`, `sub`, `tokenType: refresh`, `sid` | 7 days | `HttpOnly` cookie; never returned in JSON |

The refresh cookie currently sets `HttpOnly`, `SameSite=Lax`, path `/api/v1/auth`, seven-day max-age, and `Secure` only when `NODE_ENV=production`; no `Domain` is configured. This must be reviewed against actual HTTPS, deployment topology, and cross-site frontend/API origins before production.

### Session-bound access tokens and expiry

The `sid` claim binds an access JWT to one Session document. For a protected request, both JWT `exp` and the database session query must pass; they are independent clocks. Access JWTs expire after 15 minutes, while a Session is created with a seven-day `expiresAt` (or can be revoked sooner). JWT expiry denies an old token even if its Session remains active; session expiry or revocation denies a token even while its JWT remains cryptographically valid. MongoDB TTL deletion is asynchronous, but the middleware explicitly checks `expiresAt` and requires the Session document on every protected request.

Logout updates only the Session identified by the refresh cookie. Access tokens carrying that Session's `sid` then fail authentication immediately on their next protected request. Another device's independently created session has a different `sid` and remains valid. This is server-side session revocation, not a JWT denylist or signing-key change.

## CSRF, Origin validation and rate limiting

`requireTrustedOrigin` derives the expected value from `new URL(CLIENT_URL).origin` and compares it exactly with the incoming `Origin` header. Missing or non-matching headers receive HTTP 403 with `{"success":false,"message":"Request origin is not allowed"}`. It is applied to `POST /api/v1/auth/register`, `/login`, `/refresh`, and `/logout`; `GET /auth/me` is not protected by this middleware. Origin validation is a CSRF defense, not proof of identity.

### Signed double-submit token

`POST /api/v1/auth/refresh` and `POST /api/v1/auth/logout` also use `requireCsrfToken`. The client must send the readable `csrfToken` cookie value in `X-CSRF-Token`; both values must exist and match, and a valid `refreshToken` cookie must also be present. The middleware verifies the token against that refresh-token value and returns HTTP 403 when a token is missing, mismatched, invalid, expired or bound to another refresh token.

The token format is `timestamp.nonce.signature`. The nonce is generated from 32 random bytes and encoded as base64url. The signature is HMAC-SHA256 over `timestamp.nonce.refreshToken`, keyed by required `CSRF_SECRET` (minimum 32 characters). Verification rejects malformed components, non-integer/future timestamps and tokens older than seven days. It decodes the signatures, checks their equal length, then compares them with Node's `crypto.timingSafeEqual`.

Login creates the CSRF token after issuing the refresh session and sets it alongside the refresh cookie. Successful refresh rotates the refresh session, generates a new CSRF token bound to the replacement refresh token, and sets both replacement cookies; the prior CSRF token will no longer validate against the new refresh cookie. Registration does not issue these cookies.

The `csrfToken` cookie is browser-readable (`HttpOnly=false`) so a client can copy its value to the custom header. It is set with `Path=/`, `SameSite=Lax`, a seven-day max-age, and `Secure` only when `NODE_ENV=production`. The refresh cookie remains HttpOnly. Origin validation applies to all four auth POST routes; the token check applies only to refresh and logout. CORS alone is not CSRF protection.

### Rate limiting

The general `apiLimiter` is mounted on `/api/v1` and permits 300 requests per IP per 15 minutes. Route-specific limiters also apply to login, registration and refresh:

| Route | Per-IP limit | Window |
|---|---:|---:|
| `POST /api/v1/auth/login` | 5 | 15 minutes |
| `POST /api/v1/auth/register` | 5 | 1 hour |
| `POST /api/v1/auth/refresh` | 30 | 15 minutes |

All limiters use `express-rate-limit` with standard `RateLimit-Policy`, `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset` headers enabled; these report the policy window, quota, remaining requests and seconds until reset. Legacy `X-RateLimit-*` headers are disabled. Exceeding a limit returns HTTP 429 with a JSON `success: false` response and a limit-specific message. The integration tests verify the 429 status and message, but do not assert the rate-limit headers. No custom store is supplied, so each limiter uses its default in-memory store. This is suitable for a single-process setup; counts reset on process restart and are not shared by multiple backend instances. Logout, `/auth/me` and health have no route-specific limiter but remain subject to the 300/15m API limit. Production multi-instance deployments should use a shared store. The app does not set Express `trust proxy`; deployments behind a reverse proxy must review and explicitly configure trusted hops so limits use the intended client IP without trusting arbitrary forwarded headers. The `loopback` proxy setting in the registration/login test is test-only.

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

- Missing refresh cookie or missing/invalid CSRF cookie/header is rejected with HTTP 403 by middleware before the controller runs.
- If a valid CSRF pair is supplied but the service cannot identify an active session, revocation is a no-op; the controller clears the cookies and returns HTTP 200.
- On a matching session, it is revoked and HTTP 200 is returned. The refresh cookie is cleared; the CSRF cookie is cleared with a mismatched path (`/api/v1/auth` instead of its issue path `/`), so browser removal is not reliable.
- If MongoDB fails during revocation, the error is forwarded before cookie clearing; the client may receive a 5xx and the cookie is not explicitly cleared by this handler.
- Logout revokes the matching Session; the Bearer middleware rejects access JWTs bound to it on subsequent protected requests. It does not affect a different device session.
- Logout-all-devices is not implemented.

## Authorization model

Authorization must follow verified identity → active WorkspaceMember → workspace permission → ProjectMember/project policy → resource ownership/assignment. Roles are `OWNER`, `ADMIN`, `MANAGER`, `MEMBER`; ordinary project access requires ProjectMember; personal tasks are owner-only. Workspace and WorkspaceMember models plus a transactional creation service/controller now exist, but no workspace route or role/membership authorization middleware is mounted or tested. Project authorization and tenant isolation are also not implemented. A valid JWT and matching active session prove authenticated identity only, not resource access.

## Limitations and hardening

| Area | Current limitation | Follow-up |
|---|---|---|
| CSRF cookie clearing | CSRF cookie is issued at `Path=/` but logout clears at `/api/v1/auth`; browsers may retain it because the cookie path differs | Align the clearing path with issuance and add a test asserting the exact `Path=/` attribute |
| CSRF / Origin | Signed double-submit token protects refresh/logout; exact Origin checks cover all four auth POST routes; cookie is SameSite=Lax | Validate cookie, Origin and header behavior across deployed origins; CORS alone is not protection |
| Rate limiting | General and route-specific IP limits use default in-memory stores; no shared storage or production proxy trust config | Configure a shared store and bounded trusted-proxy policy for multi-instance deployment |
| Account enumeration | Duplicate registration is 409; inactive account is 403 | Review response policy and test enumeration behavior |
| Access revocation | `sid` and a database Session lookup enforce revocation and session expiry on protected requests; this adds a database read per protected request | Verify failure/availability behavior and add tests for all protected routes as they are introduced |
| Logout | Only current refresh session is revoked | Add logout-all-devices and tests |
| Cookie deployment | `Secure` depends only on `NODE_ENV`; `SameSite=Lax` and cross-origin behavior need deployment review | Test exact production frontend/API origins, TLS termination and cookie scope |
| Security headers | Helmet is enabled with defaults; policies not reviewed for product assets | Review CSP and deployment headers before release |
| Logs | Error handler logs full 5xx Error objects; startup/DB failures log error messages | Redact and validate production log fields |
| Verification | Full nine-file integration suite passed 47 tests on 2026-11-16 against a disposable test database. Rate-limit headers and the exact CSRF-cookie clearing path are not asserted by tests | Re-run in CI against isolated MongoDB; add header and exact cookie-path regression assertions |
| Workspace authorization | Workspace schemas and create service/controller exist, but no route, role enforcement, membership checks or tenant isolation | Add protected routes and server-side policies with cross-workspace negative tests before exposing product APIs |
| Project authorization | No project/resource checks | Implement server-side policies before adding protected project routes |

Do not treat the current implementation as production-ready. See the [API reference](07_API_DOCUMENTATION.md), [testing strategy](09_TESTING_STRATEGY.md), and [roadmap](08_FEATURE_ROADMAP.md).
