# TeamSync backend

The backend is an ES-module Node.js/Express modular-monolith foundation. Implemented capabilities include validated environment configuration, a Mongoose connection, health and auth routes, a User model, login/registration services, error handling, JWT utilities, and a Session model. JWT utilities and the Session model are not yet integrated into login or refresh/logout workflows.

## Structure and responsibilities

```text
backend/
├── src/
│   ├── app.js                         # Express middleware and versioned routes
│   ├── server.js                      # DB-first startup and signal shutdown
│   ├── config/env.js                  # dotenv loading and Zod environment schema
│   ├── database/connection.js         # Mongoose connection
│   ├── middleware/error.middleware.js
│   ├── modules/
│   │   ├── auth/                      # routes, controllers, validation, services, Session model
│   │   ├── health/                    # health route/controller
│   │   └── users/                     # User model
│   └── utils/token.js                 # access/refresh JWT sign and verify helpers
├── tests/                             # no automated tests implemented yet
├── .env.example
└── package.json
```

Routes register paths, controllers validate and translate HTTP requests, services implement registration/login decisions, Mongoose models handle persistence, and middleware formats errors. Current auth endpoints are public and do not issue tokens.

## Dependencies and scripts

Runtime dependencies are `bcrypt`, `cors`, `dotenv`, `express`, `helmet`, `jsonwebtoken`, `mongoose`, and `zod`; `nodemon` is a development dependency. The declared versions/ranges are in `package.json`.

- `npm run dev` — start `src/server.js` with Nodemon.
- `npm start` — start `src/server.js`.
- No `test` script or automated backend test suite is configured.

## Local development and environment

Run commands from this directory so `dotenv/config` loads `backend/.env`:

1. Copy `.env.example` to `.env`.
2. Set `MONGO_URI` to a reachable MongoDB instance.
3. Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to separate private values of at least 32 characters.
4. Run `npm ci`, then `npm run dev`.

The checked-in example contains only blank placeholders. `MONGO_URI` is optional in the Zod schema, but a usable value is necessary for Mongoose connection and server startup. `NODE_ENV` defaults to `development`; `PORT` to `5000`; `CLIENT_URL` to `http://localhost:5173`; `LOG_LEVEL` to `info`. The JWT secrets are required by configuration validation, although tokens are not issued by the current login flow. Never commit `.env` or use server secrets in frontend `VITE_` variables.

The server waits for MongoDB before listening. On `SIGINT` or `SIGTERM`, it stops accepting HTTP connections, closes the Mongoose connection, then exits. This is the current shutdown implementation; it has no explicit shutdown timeout.

## Implemented API

Base path: `/api/v1`. The health route is public.

| Method | Path | Purpose | Success |
|---|---|---|---|
| GET | `/api/v1/health` | Health check | 200 |
| POST | `/api/v1/auth/register` | Register a user | 201 |
| POST | `/api/v1/auth/login` | Check credentials and return a user DTO | 200 |

Registration accepts a strict `name`, `email`, and `password` object. Names are trimmed and limited to 2–80 characters; email is trimmed, validated, and lowercased; passwords require at least 12 characters and no more than 72 UTF-8 bytes. Login accepts a strict `email` and `password` object, with a non-empty password capped at 72 UTF-8 bytes. Both endpoints are currently unauthenticated. Login returns no JWT or session cookie.

The error middleware maps Zod and Mongoose validation errors to 400, duplicate-key conflicts to 409, and hides 5xx messages in production. Login returns 401 for invalid credentials and 403 for a non-active account. See [API documentation](../docs/07_API_DOCUMENTATION.md) for request/response shapes and known limitations.

## Current security and verification limits

The User model stores name, normalized unique email, `passwordHash` (`select: false`), status (`active`, `suspended`, `deleted`) and Mongoose timestamps. Its pre-save hook bcrypt-hashes modified password values with cost 12; `comparePassword` uses `bcrypt.compare`. JWT helpers use separate secret variables, HS256, issuer/type/subject claims, a 15-minute access lifetime, and a seven-day refresh lifetime. The Session model stores a hidden unique refresh-token hash and expiry/revocation/replacement/last-use metadata with a TTL index. These primitives do not yet provide login token issuance, refresh rotation, logout/revocation workflows, authentication middleware, or workspace authorization.

Email verification, rate limiting, CSRF protection, automated backend tests, and an authorization layer are not implemented. The error middleware logs full 5xx Error objects to the server console; review/redact server-side logs before production. Live MongoDB startup was not verified during the documentation update. The Postman results in the implementation-status document were reported by the project owner and were not independently repeated here.
