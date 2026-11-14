# Feature Roadmap

**R1 product baseline frozen:** 2026-11-13
**Implementation snapshot:** 2026-11-14

## Release scope

### Release 1 — Essential usable product (P0)

- Account registration/login, email verification, password recovery, sessions and profile basics.
- Workspaces, WorkspaceMember, invitations and role-based access.
- Private-by-default projects, ProjectMember and project-scoped permissions.
- Tasks, Kanban workflow, comments and checklists.
- My Day and private personal tasks.
- Project-scoped chat, notifications, activity and authorized analytics.
- Responsive frontend and dark/light themes.
- Security baseline including tenant isolation, CSRF and audit coverage.

### Release 2 — Productivity and collaboration

Calendar/events, recurring tasks, advanced reminders, direct/group messaging, knowledge base, universal search, command palette, time tracking, file attachments, advanced notification preferences and templates.

### Release 3 — Advanced

Google Calendar/GitHub integrations, MFA, advanced reporting, custom roles, automation, AI insights and optional billing.

## Status definitions

- **COMPLETED** — implemented and verified with a relevant check.
- **IMPLEMENTED** — code exists, but integration or end-to-end verification is incomplete.
- **IN PROGRESS** — partially implemented.
- **PLANNED** — not implemented.

Status refers to the current workspace source. MongoDB-backed tests were not run for this documentation task.

## Feature status

| Feature | Status | Evidence / limitation |
|---|---|---|
| Express project foundation | COMPLETED | ES-module app/server, middleware and routes exist; syntax checked. |
| Environment validation | COMPLETED | dotenv + Zod; required JWT secrets need at least 32 characters. |
| MongoDB connection | IMPLEMENTED | Mongoose connect is awaited before listen; live connection not independently verified. |
| Health endpoint | COMPLETED | `GET /api/v1/health` returned HTTP 200 in smoke check. |
| User model / bcrypt | IMPLEMENTED | Schema, hash hook (cost 12), password comparison method and safe query default exist; owner reports hash verified in MongoDB. |
| Registration | IMPLEMENTED | Strict validation/controller/service, duplicate pre-check and safe DTO exist; owner-reported manual Postman results. |
| Login | IMPLEMENTED | Status/password checks, Session creation, access JWT response and refresh cookie exist; HTTP endpoint integration test is absent. |
| Central error middleware | IMPLEMENTED | Mounted and maps Zod/Mongoose/duplicate-key errors; 5xx log redaction remains. |
| JWT helpers | IMPLEMENTED | HS256 sign/verify; 15-minute access and seven-day refresh; source inspected. |
| Refresh Session persistence | IMPLEMENTED | Family, SHA-256 token hash, expiry/revocation/replacement/last-use fields and indexes exist; DB index build not checked live. |
| Refresh rotation/replay | IMPLEMENTED | Transaction, conditional update and family revocation implemented; integration tests exist but were not run here. |
| Single-device logout | IMPLEMENTED | Revokes matching refresh session and clears cookie; no dedicated logout test. |
| `/auth/me` authentication | IMPLEMENTED | Bearer JWT/user status checks exist; no route/middleware test or workspace authorization. |
| Transaction integration tests | IMPLEMENTED | Commit and rollback cases exist; not run in this task. |
| Refresh integration tests | IMPLEMENTED | Rotation, invalid JWT, replay, concurrency, suspended user and expired DB session cases exist; not run in this task. |
| Email verification / password reset | PLANNED | No routes, persistence flow or mail integration. |
| CSRF / explicit Origin validation | PLANNED | No CSRF token or Origin validation middleware. |
| Authentication rate limiting | PLANNED | No limiter configured. |
| Logout-all-devices / access revocation | PLANNED | Logout affects one refresh session; access token remains valid until expiry. |
| Workspace/RBAC/projects/tasks | PLANNED | Approved R1 requirements, no active routes or models. |
| Project chat / Socket.IO | PLANNED | No Socket.IO integration. |
| Frontend product/auth integration | PLANNED | React starter only; no API/auth wiring. |
| Automated HTTP auth tests | PLANNED | No controller, cookie, logout or Bearer middleware integration tests. |

The project owner reports manual Postman/MongoDB checks for registration 201, duplicate email 409, invalid registration 400, password hashing, login 200 and invalid credentials 401. These are owner-reported manual results, not automated coverage and were not repeated during this documentation task.

## Milestones

| Milestone | Status | Dependencies | Acceptance criteria | Remaining work |
|---|---|---|---|---|
| Backend foundation | IMPLEMENTED | Node/npm, valid config, MongoDB | Config rejects invalid required values; DB gates listen; health returns 200; signals close server/DB | Verify live DB startup and operational shutdown |
| Auth/session foundation | IN PROGRESS | MongoDB replica set for transactions | Register/login/refresh/logout/me behavior verified; only token hash persisted; rotation and replay checks pass | Run integration tests; add HTTP route/cookie tests |
| Authentication hardening | PLANNED | Auth/session foundation | CSRF/Origin controls and rate limits reject negative cases; logout-all-devices and access revocation policy tested | Design/implement protections; review cookies, headers and logs |
| Core product | PLANNED | Authentication and authorization | Workspace/invite/role/project/task/comment/notification flows with tenant-isolation tests | Implement models, services, routes, policies and integration tests |
| Collaboration | PLANNED | Project authorization and persistence | Project chat persists before delivery; unauthorized room/event access rejected | Add Socket.IO and real-time notifications |
| Frontend integration | PLANNED | Stable API contracts and auth transport | Auth, workspace, project, task and notification UI works against API | Router/providers, API client, state and E2E tests |
| Beta deployment | PLANNED | Tested vertical slice | Staging env, managed secrets, backup/restore, monitoring, error tracking and E2E smoke checks | Deployment config, runbooks, recovery test and limited beta |
| Production readiness | PLANNED | Beta validation/security review | Security, performance, index and recovery reviews accepted; alerts/runbooks operational | Independent review, load tests, drills and release approval |

## Priorities

P0 = MVP/security prerequisite; P1 = important follow-up; P2 = later/optional. Do not move later features into R1 without documenting value, dependencies, security/data impact and revised acceptance criteria. No completion percentages are estimated.
