# Deployment and Environment Guide

## Contents

- [Prerequisites](#prerequisites)
- [Backend local setup](#backend-local-setup)
- [Environment variables](#environment-variables)
- [Frontend local setup](#frontend-local-setup)
- [Operational and production notes](#operational-and-production-notes)

## Prerequisites

- Node.js and npm. The package does not declare a supported Node version.
- A MongoDB deployment. Refresh rotation and transaction tests require a replica set or sharded deployment; MongoDB Atlas is a candidate, but live Atlas connectivity was not verified in this documentation task.
- Git.

## Backend local setup

From `backend/`:

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

Set the required environment variables in the local `.env` before starting. The server calls `connectDB()` before listening, so MongoDB must be reachable. Use `npm start` for the non-Nodemon start command.

For MongoDB Atlas, provision a cluster, a least-privilege database user and a narrowly scoped network access rule. Copy the Atlas driver URI into local `MONGO_URI` and keep it in secret storage; never paste credentials into documentation, logs or source control. Use a separate disposable database for integration testing.

## Environment variables

The source of truth is `backend/src/config/env.js`. Root and backend `.env.example` files contain placeholders only. The local `.env` is ignored by Git and must never be committed. Do not copy server secrets into frontend `VITE_` variables.

| Variable | Required | Validation/default | Operational guidance |
|---|---|---|---|
| `NODE_ENV` | No | `development`, `production`, or `test`; default `development` | Use `production` behind correctly configured HTTPS in production |
| `PORT` | No | Positive integer; default `5000` | Set from deployment platform |
| `MONGO_URI` | Schema-optional; server effectively requires it | No default; passed to `mongoose.connect` | Store in secret manager; use a replica-set deployment for transactions |
| `JWT_ACCESS_SECRET` | Yes | At least 32 characters | Generate a private random secret and rotate through an explicit key lifecycle |
| `JWT_REFRESH_SECRET` | Yes | At least 32 characters | Use a separate value from access secret; code does not enforce difference |
| `CLIENT_URL` | No | Valid URL; default `http://localhost:5173` | Set exact trusted frontend origin; CORS is not CSRF protection |
| `LOG_LEVEL` | No | `fatal`, `error`, `warn`, `info`, `debug`, `trace`; default `info` | Currently not wired to a logging framework |

No values for MongoDB credentials or JWT secrets are included in this guide.

## Frontend local setup

From `frontend/`:

```powershell
npm ci
npm run dev
npm run lint
npm run build
```

These are the scripts declared in `frontend/package.json`. The frontend is a starter and is not yet integrated with API auth/session behavior. If an API base URL setting is later wired, its configured name is `VITE_API_BASE_URL`; never place server-side credentials in Vite environment variables.

## Operational and production notes

- Refresh cookies currently set `HttpOnly`, `SameSite=Lax`, path `/api/v1/auth`, seven-day max-age, and `Secure` only when `NODE_ENV=production`; no `Domain` is configured. Test cookie behavior behind the real TLS proxy and frontend/API topology.
- CORS allows `CLIENT_URL` with credentials, but there is no explicit CSRF token or Origin validation. Do not assume CORS or SameSite alone completes CSRF defense.
- Access JWTs expire after 15 minutes; refresh JWT/session lifetime is seven days. Logout revokes the matching refresh session only; a previously issued access JWT may remain usable until expiry.
- Refresh rotation uses MongoDB transactions. The target database must support transactions; verify backup/restore and index creation in an isolated staging deployment.
- The error middleware hides 5xx response text in production but logs the full Error object. Database/startup paths also log error messages. Review and redact logs before production.
- Rate limiting, email verification, logout-all-devices, access-token revocation, workspace authorization and monitoring/error tracking are not implemented.

### Production readiness checklist

- Configure HTTPS, trusted origins, exact CORS, CSRF/Origin controls and cookie attributes.
- Provision secret-manager values and verify both JWT secrets are sufficiently strong and distinct.
- Restrict MongoDB network/database access; verify transaction support and indexes.
- Redact logs and confirm errors never expose tokens, credentials or connection details.
- Add rate limits, monitoring, alerts and error tracking.
- Test isolated backup restore, session cleanup, deployment rollback and end-to-end flows.
- Complete security review before production; the current foundation is not production-ready.
