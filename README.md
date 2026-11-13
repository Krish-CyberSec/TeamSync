# TeamSync

TeamSync is a multi-workspace collaboration and personal productivity platform.

**Product statement:** One account. Multiple workspaces. Personal productivity. Complete team collaboration.

## Architecture and technology

The approved product architecture is a modular monolith: React/Vite/Tailwind CSS v4 frontend and Node.js/Express/Mongoose backend with MongoDB, Zod validation, and versioned REST under `/api/v1`. The frontend package declares React Router, TanStack Query, Zustand, Axios and Lucide React. The backend package declares Express, Mongoose, Zod, bcrypt, jsonwebtoken, dotenv, Helmet and CORS.

Package presence and approved architecture are not evidence that a feature is integrated. For example, JWT utilities exist but the login endpoint does not issue tokens; Socket.IO is planned but not integrated. Workspace roles and tenant rules remain approved requirements, not implemented backend authorization.

## Repository structure

```text
backend/
  src/config/       Environment schema
  src/database/     Mongoose connection
  src/middleware/   Express error handling
  src/modules/      Auth, health and user model
  src/utils/        JWT helpers
  tests/            No automated backend tests yet
frontend/
  src/              Starter app plus scaffolded app/features/components/lib/styles
docs/               Canonical product and engineering documentation
```

## Local setup

Use Node.js and npm; the repository does not yet declare a supported Node version.

Backend, from the `backend` directory:

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

Before starting, set a reachable MongoDB URI and separate JWT secrets of at least 32 characters in the local `backend/.env`. The example file has blank placeholders only. `MONGO_URI` is optional in schema validation but required for successful database startup. Never commit `.env` or put server secrets in frontend variables.

Frontend, from the `frontend` directory: run `npm ci`, then `npm run dev`. `npm run lint` and `npm run build` are the configured frontend quality commands. The frontend remains a starter screen and is not connected to the API.

## Current backend API

All current endpoints are public; login does not yet issue an access token or session cookie.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/auth/register` | Register a user |
| POST | `/api/v1/auth/login` | Validate credentials and return a user DTO |

See [API documentation](docs/07_API_DOCUMENTATION.md) for request schemas, responses, errors, and planned endpoints.

## Implementation progress

The backend has environment validation, Express setup, Helmet/CORS, MongoDB connection/startup code, health and auth routes, User and Session models, centralized errors, and JWT sign/verify utilities. Registration/login flows and token/session primitives are at different implementation stages; only the token helpers and Session model are not connected to session workflows. Email verification, refresh rotation, logout/revocation, authentication middleware, workspace authorization, rate limiting, CSRF, Socket.IO and automated backend tests remain planned.

The owner-reported manual Postman results and status-by-feature table are in [Feature Roadmap](docs/08_FEATURE_ROADMAP.md). They are not automated coverage. The detailed implementation snapshot is [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

## Documentation workflow

Read `AGENTS.md`, `PROJECT_CONTEXT.md` and relevant files in `docs/` before coding. `docs/` is canonical. Update affected docs, tests, project context and `docs/11_CHANGELOG.md` whenever behavior, architecture, schema, API or scope changes. Review [security and access](docs/13_SECURITY_AND_ACCESS.md) before treating the backend as production-ready. Never commit secrets; see `.env.example`.

## Current implementation status
As of 2026-11-14, the backend has a partial foundation: Express startup, Zod environment parsing, MongoDB connection, health and registration endpoints, and a bcrypt-backed user model. Login, email verification, JWT/session lifecycle, authorization, centralized error handling, rate limiting, CSRF protection and automated backend tests are not implemented. The approved stack and R1 scope describe the target architecture, not completed functionality. See `PROJECT_CONTEXT.md` and `docs/` for the detailed status and contracts.
