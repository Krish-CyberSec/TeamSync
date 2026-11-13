# Deployment Guide

> Add exact commands after application package configuration is finalized.

## Prerequisites
Supported Node.js version, npm, Git, MongoDB local or Atlas. Optional storage/email provider accounts.

## Planned backend environment
`NODE_ENV`, `PORT`, `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, token expiry values, `CLIENT_URL`, `LOG_LEVEL`. Add storage/email settings only after provider selection.

## Planned frontend environment
`VITE_API_BASE_URL=http://localhost:5000/api/v1`

Never put server secrets in Vite variables; VITE-prefixed values are browser-visible.

## Deployment baseline
Frontend Vercel/CDN; backend Render/Railway or equivalent; MongoDB Atlas; file storage provider TBD; email provider TBD; CI runs lint/tests/build before deployment.

## Production checklist
HTTPS; trusted CORS origins; managed secrets; restricted database access; backups and restore test; safe errors; redacted logs; rate limits; health checks; verified indexes; rollback procedure.
