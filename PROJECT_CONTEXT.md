# TeamSync Project Context

> Update at the end of every meaningful milestone. This is the concise, current snapshot; `docs/` remains canonical.

## Product
TeamSync is a web collaboration and personal productivity platform for individuals, student teams, development teams, startups, freelancers and small organizations. It combines My Day/private personal tasks with multi-workspace collaboration, private projects, Kanban tasks, comments, project chat, notifications, activity and analytics.

## Confirmed technology and architecture
| Area | Decision |
|---|---|
| Architecture | Modular monolith |
| Frontend | React + Vite + Tailwind CSS v4 |
| Frontend routing | React Router |
| Server state | TanStack Query |
| Client global state | Zustand |
| HTTP client | Axios |
| Icons | Lucide React |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Password hashing | bcrypt |
| Auth | 10–15 minute access JWT + server-tracked rotating refresh session |
| Browser token transport | Access token in memory; refresh cookie HttpOnly/Secure with CSRF protection |
| Validation | Zod |
| Real-time | Socket.IO; persist before emit |
| API | `/api/v1` |
| Roles | OWNER, ADMIN, MANAGER, MEMBER |
| Membership | Separate WorkspaceMember; unique `{ workspace: 1, user: 1 }` |
| Project access | Private by default; ProjectMember for ordinary member access |
| Themes | Dark and light |

Frontend library roles are recorded in ADR-014. These are architecture/tooling decisions; package presence and scaffold files do not mean runtime integration or product features are implemented.

The approved 10–15 minute access-JWT and rotating refresh-session design remains the target. Current code has 15-minute/seven-day token helpers and a Session model, but login does not issue or verify a session token and no refresh/logout lifecycle is connected.

## Approved product/security decisions
- A user may have different roles in different workspaces.
- JWT proves identity, not resource authorization.
- Workspace OWNER/ADMIN can administer all projects in their workspace; MANAGER requires explicit project authority; ordinary members require ProjectMember.
- Personal tasks are owner-only and non-shareable in R1.
- Invitations are email-bound, single-use, hashed at rest and expire after seven days; resend/revoke supported.
- R1 includes task comments and project-scoped chat; direct/group messaging is R2.
- R1 excludes private task/chat attachments.
- Account deletion: soft-delete + 30-day recovery, then delete/anonymize eligible data.
- Workspace deletion: OWNER-only, confirmation-gated, soft-delete-first.
- Product activity retention 180 days; security audit retention 365 days; daily backups retained 30 days with restore tests. Validate legal obligations before production.

## Release plan
- R1: auth/profile/sessions, workspaces/membership/invitations/RBAC, private projects/ProjectMember, tasks/Kanban/comments/checklists, My Day/private personal tasks, project chat, basic notifications/activity/analytics, responsive dark/light UI.
- R2: calendar, recurring tasks, advanced reminders, direct/group messaging, knowledge base, search, command palette, attachments, time tracking and templates.
- R3: integrations, MFA, advanced reporting, custom roles, automation, AI insights and optional billing.

## Current status
**R1 planning baseline approved and frozen. Implementation status inspected 2026-11-14:**

### Current source layout
- `backend/src/config/`: dotenv loading and Zod environment schema.
- `backend/src/database/`: Mongoose connection.
- `backend/src/middleware/`: centralized Express error handler.
- `backend/src/modules/auth/`: routes, controller, Zod schemas, registration/login services and Session model.
- `backend/src/modules/health/`: health route/controller.
- `backend/src/modules/users/`: User model.
- `backend/src/utils/`: JWT signing/verification helpers.
- `frontend/src/`: app starter plus scaffolded app, feature, component, hook, lib, page and style folders.
- `docs/`: canonical requirements, architecture, API, security, roadmap and implementation notes.

### Implemented and verified
- Backend uses Node.js ES modules, Express, Mongoose, Zod, Helmet, CORS, bcrypt and `jsonwebtoken`; dependency and script declarations are in `backend/package.json`.
- Environment validation requires `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to each contain at least 32 characters; code does not enforce that their values differ. `MONGO_URI` is schema-optional but required for successful database startup.
- Express mounts public `GET /api/v1/health`, `POST /api/v1/auth/register` and `POST /api/v1/auth/login`; error middleware handles Zod/Mongoose validation and Mongo duplicate-key errors.
- Registration/login use strict Zod schemas and service/controller separation. The User model hashes passwords with bcrypt cost 12 and excludes hashes from ordinary queries.
- JWT helpers sign and verify HS256 access (15-minute) and refresh (7-day) tokens with separate secrets, issuer, subject and type claims; refresh tokens also carry `sid`.
- Session model defines a user reference, hidden unique token hash, expiry, revocation/replacement/last-use fields, timestamps and TTL index.
- Current-task verification: 14 backend JavaScript files passed `node --check`; an in-process smoke check returned health 200, registration/login validation 400, and generated/verified access and refresh claims. This did not connect to MongoDB.

### User-reported manual checks
The project owner reports successful Postman/MongoDB checks for registration 201, duplicate email 409, invalid registration 400, password hashing in MongoDB, login 200, and invalid credentials 401. These results are manually reported, not automated tests and were not independently repeated during this documentation update.

### Remaining implementation and limitations
- JWT helpers and Session model are not integrated into login. No access token or refresh cookie is returned by login.
- Session creation, refresh rotation/reuse detection, logout/revocation, authentication middleware and workspace/resource authorization are not implemented.
- Email verification, rate limiting, CSRF protection and automated backend tests are not implemented. `backend/package.json` has no test script and `backend/tests/` contains only a placeholder.
- Live MongoDB connection and server startup were not verified. The frontend remains a starter screen without router/provider wiring, feature behavior or API integration; Socket.IO is not integrated.
- Login returns 403 for non-active accounts, which may disclose account status. The error handler logs the full Error object for 5xx failures; production logs need a redaction review. Do not treat this backend as production-ready.

The local `backend/.env` is ignored by Git and was not read during this review. Use `backend/.env.example` only as a blank placeholder reference; never commit secrets.

## Remaining implementation choices
Email provider/hosting; exact permission catalogue and manager permission granularity; outbox/background worker need; avatar storage provider; legal review of retention/deletion; detailed data disposition on workspace deletion.

## Next milestone
Add automated backend tests for config, models, registration/login and error responses; verify startup against a disposable MongoDB test database; review safe logging and account-state enumeration. Then implement the approved email-verification and token/session lifecycle with refresh rotation, logout/revocation and authentication middleware, without changing ADR-009 transport decisions. Add server-side authorization before protected workspace/project APIs. After those contracts stabilize, connect frontend router/providers and implement a tested vertical slice.

## Last updated
2026-11-14 — Backend registration/login, error handling, token/session primitives and current implementation gaps documented.
