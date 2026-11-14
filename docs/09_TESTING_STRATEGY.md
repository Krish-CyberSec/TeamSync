# Testing Strategy

**R1 baseline:** frozen 2026-11-13
**Current backend test inventory:** inspected 2026-11-14

## Contents

- [Current test setup](#current-test-setup)
- [Existing integration tests](#existing-integration-tests)
- [Running tests safely](#running-tests-safely)
- [Coverage gaps](#coverage-gaps)
- [Target quality gates](#target-quality-gates)

## Current test setup

The backend uses Node.js built-in `node:test` and `node:assert/strict`. Two MongoDB integration files exist under `backend/tests/integration/`. `backend/package.json` does **not** define a `test` script; there is no configured unit-test runner or HTTP test harness.

For this task, all 14 backend source JavaScript files and both test files passed `node --check`. The MongoDB integration tests were not run because they write to MongoDB and require a replica-set-capable, dedicated test database.

## Existing integration tests

### `tests/integration/transaction.test.js`

1. **Commit case:** creates a temporary collection if needed, inserts two documents inside `withTransaction`, and asserts both are visible after commit.
2. **Rollback case:** inserts one document, deliberately throws, and asserts the document is not visible outside the aborted transaction.

Each test deletes the documents it created and ends its Mongoose session. The collection `teamsync_transaction_probe` is not dropped. The test connects to the database selected by `MONGO_URI`, so running against production/shared data is unsafe.

### `tests/integration/auth-rotation.test.js`

The test file connects with `dbName: "teamsync_test"`, creates a unique User for each scenario, and cleans up created Session/User records in its `after` hook.

| Test | Behavior asserted |
|---|---|
| Valid rotation | Old session revoked; replacement exists, is active, stays in same family and stores hash of new token |
| Invalid JWT | Malformed refresh token rejected with 401 |
| Replay | Reusing original rotated token rejects and revokes active sessions in the family |
| Concurrent refresh | One request succeeds, one fails, and the family ends with no active sessions |
| Suspended account | Refresh is rejected with 403 and active family session is revoked |
| Expired DB session | Explicit expired `expiresAt` rejects rotation with 401 |

These are service/model integration tests. They do not currently exercise the HTTP controllers, cookies, registration/login endpoints, logout route, or auth middleware.

## Running tests safely

From `backend/`, configure `NODE_ENV=test`, valid `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values (at least 32 characters each), and `MONGO_URI` pointing to an isolated disposable replica-set test database. Do not display or commit local secret values.

```powershell
node --test tests/integration/transaction.test.js tests/integration/auth-rotation.test.js
```

Important database-isolation details:

- The auth suite explicitly uses the `teamsync_test` database name.
- The transaction suite uses the database embedded in `MONGO_URI` and creates `teamsync_transaction_probe` there.
- Configure the URI database as a disposable test DB so both suites remain isolated; the transaction test deletes its documents but leaves its collection behind.
- Multi-document transactions require a MongoDB replica set or sharded deployment. A standalone MongoDB server will not support these tests.
- No npm test script or test runner wrapper is configured.

The suite was not run during this documentation task; no test pass is claimed.

## Coverage gaps

- HTTP-level login/register/refresh/logout/me behavior, DTOs, cookie attributes and error statuses.
- Logout behavior with absent/invalid/expired cookie and database failure.
- Bearer auth malformed header, invalid JWT, missing/inactive user, and DB failure.
- Config invalid-input cases as automated tests.
- Registration duplicate-key race and persisted bcrypt hash assertions.
- JWT expiry, wrong issuer/type/algorithm/signature and mismatched claims.
- TTL cleanup timing/index creation against MongoDB.
- Session/database failure handling and transaction rollback inside refresh rotation.
- CSRF/Origin rejection, authentication rate limiting, logout-all-devices and access-token revocation.
- Workspace isolation, role boundaries and project membership (not implemented).

## Target quality gates

- Add focused positive and negative tests alongside each behavior change.
- Run DB-backed tests only with a dedicated test database; verify cleanup and transaction support.
- Test external HTTP behavior as well as service/model logic for auth changes.
- Add cross-workspace isolation and privilege-escalation tests before protected workspace/project APIs ship.
- Run frontend lint/build after frontend changes; these scripts are defined in `frontend/package.json`.
- Never claim tests passed unless the exact command ran successfully.
