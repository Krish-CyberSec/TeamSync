# Deployment Guide

## Prerequisites
Node.js and npm, Git, and a reachable MongoDB local instance or Atlas cluster. A supported Node.js version has not yet been declared in `backend/package.json`.

## Backend local setup
From `backend/`, copy `.env.example` to `.env`, set `MONGO_URI`, run `npm ci`, then run `npm run dev`. The server connects to MongoDB before it starts listening. `npm start` runs the same entry point without Nodemon.

Environment configuration is loaded with dotenv and validated with Zod. `NODE_ENV` defaults to `development`, `PORT` to `5000`, `CLIENT_URL` to `http://localhost:5173`, and `LOG_LEVEL` to `info`. `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are required and each must contain at least 32 characters. Use different private values; the schema does not enforce that they differ. `MONGO_URI` is optional in the schema, but a usable URI is necessary for Mongoose to connect and for the server to start.

The example file contains blank, non-secret placeholders. The local `.env` is excluded by repository ignore rules. Never commit `.env` or put server secrets in frontend `VITE_` variables.

The JWT helpers currently use the access secret for 15-minute HS256 access tokens and the refresh secret for seven-day HS256 refresh tokens. Token helpers and the Session schema are implemented but not integrated into login/refresh/logout endpoints. Do not treat successful bootstrap or these primitives as production authentication.

## Planned frontend environment
`VITE_API_BASE_URL=http://localhost:5000/api/v1`

Never put server secrets in Vite variables; VITE-prefixed values are browser-visible.

## Deployment baseline
Frontend Vercel/CDN; backend Render/Railway or equivalent; MongoDB Atlas; file storage provider TBD; email provider TBD; CI runs lint/tests/build before deployment.

## Production checklist
HTTPS; trusted CORS origins; managed secrets; restricted database access; backups and restore test; centralized safe errors; redacted logs; rate limits; health checks; verified indexes; rollback procedure. Error handling exists, but the handler logs full 5xx Error objects; review log redaction before production. Rate limits, CSRF controls, auth/session workflows and production readiness checks are not yet implemented. Live MongoDB startup was not verified for this update.
