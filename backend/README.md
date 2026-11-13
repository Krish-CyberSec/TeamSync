# TeamSync backend

The backend foundation is partially implemented. It currently provides an Express application, validated environment configuration, a MongoDB connection, health and registration endpoints, and a Mongoose user model. Authentication sessions, email verification, centralized error handling, authorization, and automated tests are not implemented.

## Run locally

1. Copy `.env.example` to `.env` and set `MONGO_URI` to a reachable MongoDB instance.
2. From this directory, install dependencies with `npm ci`.
3. Start the development server with `npm run dev` (or `npm start` without Nodemon).
4. The health endpoint is `GET /api/v1/health`. Registration is `POST /api/v1/auth/register`.

The server connects to MongoDB before listening. `MONGO_URI` is currently optional in the environment schema, but a working value is required for server startup. JWT secrets are placeholders for planned session functionality and are not used by the current endpoints.

## Implemented behavior

- Environment variables are parsed with Zod; invalid values terminate startup.
- Express uses Helmet, JSON body parsing, and credentialed CORS restricted to `CLIENT_URL`.
- The health route returns a successful JSON response.
- Registration validates a strict `{ name, email, password }` body, normalizes email, enforces a 12-character minimum and bcrypt's 72-byte input limit, and rejects an existing email with HTTP 409.
- User passwords are hashed with bcrypt before persistence. The model exposes the password hash only when explicitly selected.

The registration endpoint does not yet verify email ownership or establish a login session. Registration validation/database errors also do not yet have a centralized, stable API error response; `src/middleware/error.middleware.js` is currently an empty placeholder and is not mounted.

```text
backend/
├── src/
│   ├── config/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── workspaces/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── notifications/
│   │   └── chat/
│   ├── middleware/
│   ├── database/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── tests/
├── .env
├── .env.example
└── package.json
```

Keep local secrets in `.env`; use `.env.example` for blank, non-secret configuration placeholders. Never commit `.env` or put server secrets in frontend `VITE_` variables. No automated test script is configured yet.
