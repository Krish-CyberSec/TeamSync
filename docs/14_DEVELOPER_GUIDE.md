# Developer Onboarding Guide

Welcome to TeamSync. This guide describes the current repository and patterns for extending its backend. Product rules and approved decisions remain canonical in `docs/`; read [Project Context](../PROJECT_CONTEXT.md), the relevant requirement, [Architecture](05_SYSTEM_ARCHITECTURE.md), [API](07_API_DOCUMENTATION.md), and [Security](13_SECURITY_AND_ACCESS.md) before implementation.

## Contents

- [Repository map](#repository-map)
- [Development workflow](#development-workflow)
- [Adding a backend feature module](#adding-a-backend-feature-module)
- [Models and persistence](#models-and-persistence)
- [Services, controllers and routes](#services-controllers-and-routes)
- [Validation and errors](#validation-and-errors)
- [Integration tests](#integration-tests)
- [Security conventions](#security-conventions)

## Repository map

```text
backend/src/
  app.js                         Express middleware and versioned route mounts
  server.js                      MongoDB-first startup and signal shutdown
  config/env.js                  dotenv + Zod configuration
  database/connection.js         Mongoose connection
  middleware/                    Bearer auth and centralized errors
  modules/auth/                  auth routes/controller/schemas/service/Session
  modules/health/                health route/controller
  modules/users/                 User model
  utils/                         JWT signing/verifying and SHA-256 token hash
backend/tests/integration/       MongoDB transaction and auth rotation tests
frontend/src/                    React/Vite starter and scaffolding
docs/                            Product, architecture, API, security and operations docs
```

Only health and auth are active backend route groups. Other module directories are placeholders. The frontend is not yet a product client.

## Development workflow

1. Inspect the current code, project context, applicable product requirement and ADRs before proposing behavior.
2. Keep scope aligned with the frozen R1 decisions. Ask before changing token transport, data relationships, role semantics, external services, or API contracts.
3. Implement a small vertical slice with strict input validation, service logic, persistence and an explicit route/controller boundary.
4. Add focused positive and negative tests; include tenant/authorization tests before exposing protected resource endpoints.
5. Run syntax checks and the relevant test command. MongoDB tests must use an isolated replica-set test database.
6. Update API/schema/security/architecture/roadmap docs as applicable and record meaningful milestones in the changelog.

The backend package defines `npm run dev` and `npm start`, but no `test` script. Existing integration tests run through Node's built-in runner (see [Testing Strategy](09_TESTING_STRATEGY.md)).

## Adding a backend feature module

Use the existing domain structure under `backend/src/modules/<domain>/`. A typical module adds:

```text
<domain>.routes.js
<domain>.controller.js
<domain>.validation.js
<domain>.service.js
<domain>.model.js       # only if the feature owns persisted data
```

Add only the files the behavior needs; avoid empty layers or speculative abstractions. Keep the module cohesive and keep shared infrastructure in `middleware/`, `database/` or `utils/` only when genuinely reusable.

## Models and persistence

### 1. Define and validate a model

Use Mongoose schemas for persistence constraints, explicit references, timestamps and indexes based on actual query patterns. Normalize email-like identifiers consistently. Exclude password/token hashes from ordinary queries (`select: false`). Hash secrets before persistence; do not rely on the client to provide safe values.

For unique fields, understand that `unique: true` declares an index rather than a Mongoose validator; verify database index creation before relying on it for race protection.

## Services, controllers and routes

### 2. Implement a service

Put business rules and database interactions in `<domain>.service.js`. Accept validated values rather than `req`/`res`. Return domain results or throw errors with a `statusCode` for expected API failures. Use transactions for critical multi-document writes where the deployment supports them.

For auth/session operations, avoid logging credentials, raw tokens, cookies or secret values. Follow the established hash-at-rest approach and re-check account/session state at the service boundary.

### 3. Implement validation and controller

Define request schemas in `<domain>.validation.js`, using `.strict()` when unknown properties should be rejected. Use `.trim()`, normalization and byte-size constraints where the persisted/cryptographic operation requires them.

Controllers parse the schema, call service functions, select HTTP statuses, set/clear cookies only with consistent attributes, and return an allowlisted DTO. Never return Mongoose documents wholesale for sensitive models.

Current code uses `try/catch` and forwards failures with `next(error)`, allowing the central error handler to build the JSON response.

### 4. Register routes

Add method/path mappings in `<domain>.routes.js`, then mount the router in `backend/src/app.js` beneath `/api/v1`. Apply authentication middleware to protected routes. Authentication only establishes identity; implement resource/workspace authorization separately before accessing tenant data.

Document active method/path, auth/cookie requirements, request schema, response and expected error codes in `docs/07_API_DOCUMENTATION.md`.

## Validation and errors

`backend/src/config/env.js` validates process configuration at startup. Request validation uses Zod and the central `errorHandler` currently maps:

- Zod errors → 400 with field/message issues.
- Mongoose validation errors → 400.
- MongoDB duplicate-key errors → 409.
- Other failures → statusCode or 500; 5xx response text is generic in production.

The handler logs full 5xx Error objects to console today; production logging redaction is a known hardening task. Avoid returning database details, stack traces, credentials, JWTs or password hashes.

## Integration tests

Use `node:test` and `node:assert/strict`. Place MongoDB integration tests under `backend/tests/integration/`, isolate generated records, and clean up in `after` hooks. Transaction tests need a replica set or sharded cluster. Ensure each test database is disposable; the current transaction test uses `MONGO_URI`'s selected DB.

Current command from `backend/`:

```powershell
node --test tests/integration/transaction.test.js tests/integration/auth-rotation.test.js
```

No npm test script exists. The current suites cover transaction commit/rollback and refresh-session rotation/replay/concurrency/account/session-expiry behavior, not HTTP endpoints or logout.

## Security conventions

- Store only bcrypt password hashes and SHA-256 refresh-token digests; never persist raw bearer tokens.
- Verify JWT algorithm, issuer, expiry and token purpose; validate identifiers before querying.
- Keep access JWT in memory; refresh token in HttpOnly cookie. The current cookie is `SameSite=Lax`, uses path `/api/v1/auth`, and sets `Secure` only in production.
- Cookie-authenticated routes need CSRF/Origin protection; current CORS configuration alone is not sufficient.
- Enforce account/session state and, for product resources, workspace/project authorization on the server.
- Use allowlisted DTOs/updates, bounded list operations and tests for negative access paths.
- Do not claim production readiness until CSRF, rate limiting, log redaction, operational controls and security tests are complete.

See [Security and Access Model](13_SECURITY_AND_ACCESS.md) and [Decision Log](12_DECISION_LOG.md) for approved invariants.
