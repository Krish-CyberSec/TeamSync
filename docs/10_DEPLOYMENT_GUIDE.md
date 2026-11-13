# Deployment Guide

## Prerequisites
Node.js and npm, Git, and a reachable MongoDB local instance or Atlas cluster. A supported Node.js version has not yet been declared in `backend/package.json`.

## Backend local setup
From `backend/`, copy `.env.example` to `.env`, set `MONGO_URI`, run `npm ci`, then run `npm run dev`. The server connects to MongoDB before it starts listening. `npm start` runs the same entry point without Nodemon.

Environment configuration is loaded and validated with Zod. `NODE_ENV` defaults to `development`, `PORT` to `5000`, `CLIENT_URL` to `http://localhost:5173`, and `LOG_LEVEL` to `info`. Although `MONGO_URI` is currently optional in the schema, a valid URI is required for the server to connect and start. JWT secret fields are currently optional placeholders and are unused because token/session endpoints are not implemented.

The example file contains blank, non-secret placeholders. The local `.env` is excluded by repository ignore rules. Never commit `.env` or put server secrets in frontend `VITE_` variables.

## Planned frontend environment
`VITE_API_BASE_URL=http://localhost:5000/api/v1`

Never put server secrets in Vite variables; VITE-prefixed values are browser-visible.

## Deployment baseline
Frontend Vercel/CDN; backend Render/Railway or equivalent; MongoDB Atlas; file storage provider TBD; email provider TBD; CI runs lint/tests/build before deployment.

## Production checklist
HTTPS; trusted CORS origins; managed secrets; restricted database access; backups and restore test; centralized safe errors; redacted logs; rate limits; health checks; verified indexes; rollback procedure. Centralized error handling, rate limits, and production readiness checks are not yet implemented.
