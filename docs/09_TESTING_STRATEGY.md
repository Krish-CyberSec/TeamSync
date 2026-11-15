# Testing Strategy

**R1 baseline:** frozen 2026-11-13
**Backend test inventory:** inspected 2026-11-15

## Test setup

The backend uses Node.js built-in `node:test` and `node:assert/strict`. Six integration files exist under `backend/tests/integration/`. `backend/package.json` does not define a `test` script or a separate test runner.

The MongoDB-backed tests require `NODE_ENV=test`, valid `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values (at least 32 characters each), and an isolated disposable MongoDB replica set or sharded deployment. The test files import the environment validator, so even the rate-limit-only HTTP suite needs valid JWT secrets. Do not expose local secret values.

## Existing integration tests

| File | Verified assertions in source |
|---|---|
| `tests/integration/transaction.test.js` | A transaction commits multiple inserts atomically; an intentional failure rolls back an insert. Uses the database named by `MONGO_URI` and leaves the `teamsync_transaction_probe` collection in place. |
| `tests/integration/auth-rotation.test.js` | Valid replacement session and hash; invalid JWT rejection; replay revokes the family; concurrent refresh attempts yield one success and one rejection then revoke the family; suspended account rejection and family revocation; expired database session rejection. |
| `tests/integration/auth-register-login.test.js` | Registration success, safe DTO and bcrypt hash; duplicate email; invalid registration; unexpected registration field; successful login, access-token claims and refresh-cookie attributes; wrong password; unknown email; suspended user; invalid login input. Uses `teamsync_test` and sets `trust proxy` to `loopback` for test IPs. |
| `tests/integration/auth-logout.test.js` | Matching session revocation; invalid token cannot revoke a session; repeated logout does not modify the revoked session; logout only affects the selected device session; expired JWT cannot revoke a session. |
| `tests/integration/auth-logout.http.test.js` | HTTP logout revokes a valid session and clears its cookie; its bound access token then fails `/me`; logging out one device leaves the other active; missing/invalid cookie still succeeds and clears; malicious/missing Origin are rejected with 403; expired database session is rejected by `/me`. Uses `teamsync_test`. |
| `tests/integration/rate-limit.test.js` | HTTP 429 on the sixth login request, sixth registration request and thirty-first refresh request; checks each response message. It does not assert rate-limit headers. |

These are source-verified assertions, not a claim that the tests passed in this documentation update. The repository does not include execution output for this current set, and the DB-backed tests were not run during this documentation sync. No workspace model/service/controller tests, successful refresh-controller HTTP test, or explicit database-failure test for logout exists.

## Running tests safely

Run commands from `backend/`. Set environment values in a local ignored `.env`; do not commit or print secrets. All authentication and logout integration suites select database `teamsync_test`; `transaction.test.js` connects to the database named by `MONGO_URI`. Point `MONGO_URI` at a disposable replica-set-capable database and never at production or shared data.

Individual files:

```powershell
node --test tests/integration/transaction.test.js
node --test tests/integration/auth-rotation.test.js
node --test tests/integration/auth-register-login.test.js
node --test tests/integration/auth-logout.test.js
node --test tests/integration/auth-logout.http.test.js
node --test tests/integration/rate-limit.test.js
```

Run all six files:

```powershell
node --test tests/integration/*.test.js
```

MongoDB transactions require a replica set or sharded deployment; a standalone server is insufficient. The transaction suite deletes inserted documents but does not drop its probe collection.

## Coverage gaps

- Malformed Bearer headers, invalid JWT, missing/inactive user, and database failure on `/auth/me`; active, revoked, expired and one-device-isolation cases are covered in `auth-logout.http.test.js`.
- Successful refresh route/cookie behavior and Origin rejection on register, login and refresh (logout Origin failures are covered).
- Logout database failure and full cookie attribute verification for production `Secure` behavior.
- Rate-limit header assertions, reset behavior, multiple backend instances and reverse-proxy IP configuration.
- Config invalid-input cases as automated tests.
- Registration duplicate-key race and live unique-index provisioning.
- JWT expiry, wrong issuer/type/algorithm/signature and mismatched claims beyond tested cases.
- TTL cleanup timing/index creation and refresh-rotation rollback/failure behavior.
- Workspace isolation, role boundaries and project membership (not implemented).
- Workspace transaction rollback, duplicate-slug behavior, controller validation and request authorization (workspace files have no tests or registered route).

## Quality gates

- Add focused positive and negative tests alongside behavior changes.
- Exercise HTTP contracts as well as service/model logic for auth changes.
- Run database tests only with a dedicated disposable replica-set database; verify the selected database and cleanup first.
- Add cross-workspace isolation and privilege-escalation tests before protected workspace/project APIs ship.
- Run frontend lint/build after frontend changes; scripts are defined in `frontend/package.json`.
- Never claim tests passed unless the exact command ran successfully.
