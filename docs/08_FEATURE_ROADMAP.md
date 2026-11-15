# Feature Roadmap

**R1 product baseline frozen:** 2026-11-13
**Implementation snapshot:** 2026-11-15

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
| Registration | IMPLEMENTED | Strict validation/controller/service, duplicate pre-check, safe DTO and HTTP integration coverage exist; owner also reported manual Postman results. |
| Login | IMPLEMENTED | Status/password checks, Session creation, access JWT response, refresh cookie and HTTP integration coverage exist. |
| Central error middleware | IMPLEMENTED | Mounted and maps Zod/Mongoose/duplicate-key errors; 5xx log redaction remains. |
| JWT helpers | IMPLEMENTED | HS256 sign/verify; 15-minute access and seven-day refresh; source inspected. |
| Refresh Session persistence | IMPLEMENTED | Family, SHA-256 token hash, expiry/revocation/replacement/last-use fields and indexes exist; DB index build not checked live. |
| Refresh rotation/replay | IMPLEMENTED | Transaction, conditional update and family revocation implemented; integration tests exist but were not run here. |
| Single-device logout | IMPLEMENTED | Revokes matching session and clears cookie; bound access JWTs fail on the next protected request, while other device sessions remain active. Service/HTTP assertions exist but were not run for this documentation sync. |
| `/auth/me` authentication | IMPLEMENTED | Checks Bearer JWT, active user and exact active/unexpired Session. HTTP assertions cover valid, revoked, expired and independent device sessions; not run here. |
| Trusted-Origin validation | IMPLEMENTED | Exact `CLIENT_URL` origin required on register/login/refresh/logout; missing/mismatched Origin returns 403. No CSRF token mechanism. |
| Authentication rate limits | IMPLEMENTED | Login 5/15m, registration 5/hour and refresh 30/15m per IP; default in-memory store, no shared backend or production proxy trust config. |
| Transaction integration tests | IMPLEMENTED | Commit and rollback cases exist; not run in this task. |
| Refresh integration tests | IMPLEMENTED | Rotation, invalid JWT, replay, concurrency, suspended user and expired DB session cases exist; not run in this task. |
| Registration/login HTTP tests | IMPLEMENTED | Success, validation, duplicate email, unexpected fields, credentials, suspension, safe DTO and refresh-cookie checks exist; not run in this task. |
| Logout tests | IMPLEMENTED | Service coverage includes valid/invalid/repeated/device-specific/expired-token cases; HTTP coverage includes valid/missing/invalid cookies and trusted-Origin rejection; not run in this task. |
| Rate-limit HTTP tests | IMPLEMENTED | Tests verify the login/registration sixth-request and refresh thirty-first-request 429 thresholds; not run in this task. |
| Workspace data models | IMPLEMENTED | Workspace and WorkspaceMember schemas exist; unique slug and compound membership indexes are declared, not verified in the database. |
| Workspace create validation/controller/service | PARTIAL | Strict create schema and controller exist; service creates workspace plus creator OWNER membership in one transaction. No route, test, or authorization middleware. |
| Email verification / password reset | PLANNED | No routes, persistence flow or mail integration. |
| Logout-all-devices | PLANNED | Logout revokes only the supplied session; no all-session operation. |
| Workspace RBAC and tenant authorization | PLANNED | Roles are declared in WorkspaceMember, but membership/role checks and protected workspace routes are absent. |
| Projects/tasks/comments/activity/notifications | PLANNED | No functional models, services or routes in these modules. |
| Project chat / Socket.IO | PLANNED | No Socket.IO integration. |
| Frontend product/auth integration | PLANNED | React starter only; no API/auth wiring. |
| Workspace creation tests | PLANNED | No unit or integration tests for its transaction/controller. |
| Automated HTTP auth tests | IN PROGRESS | Register/login, logout, session-bound `/me` and limiter assertions exist; successful refresh-controller and broader failure-path coverage remain. |

The project owner reports manual Postman/MongoDB checks for registration 201, duplicate email 409, invalid registration 400, password hashing, login 200 and invalid credentials 401. These are owner-reported manual results, not automated coverage and were not repeated during this documentation task.

## Milestones

| Milestone | Status | Dependencies | Acceptance criteria | Remaining work |
|---|---|---|---|---|
| Backend foundation | IMPLEMENTED | Node/npm, valid config, MongoDB | Config rejects invalid required values; DB gates listen; health returns 200; signals close server/DB | Verify live DB startup and operational shutdown |
| Auth/session foundation | IN PROGRESS | MongoDB replica set for transactions | Register/login/refresh/logout/me behavior; session-bound access revocation; only refresh token hash persisted | Run integration tests; add successful refresh-controller HTTP coverage and remaining failure cases |
| Authentication hardening | IN PROGRESS | Auth/session foundation | Origin validation and configured rate limits have negative-path HTTP coverage; complete shared rate-limit/proxy deployment review, cookie/header/log review, logout-all-devices and broader revocation semantics | Run existing integration tests; review trusted proxy configuration and shared storage; add remaining endpoint/security tests |
| Core product | IN PROGRESS | Authentication and authorization | Workspace/invite/role/project/task/comment/notification flows with tenant-isolation tests | Finish workspace routes/RBAC/tests, then implement the remaining vertical slices |
| Collaboration | PLANNED | Project authorization and persistence | Project chat persists before delivery; unauthorized room/event access rejected | Add Socket.IO and real-time notifications |
| Frontend integration | PLANNED | Stable API contracts and auth transport | Auth, workspace, project, task and notification UI works against API | Router/providers, API client, state and E2E tests |
| Beta deployment | PLANNED | Tested vertical slice | Staging env, managed secrets, backup/restore, monitoring, error tracking and E2E smoke checks | Deployment config, runbooks, recovery test and limited beta |
| Production readiness | PLANNED | Beta validation/security review | Security, performance, index and recovery reviews accepted; alerts/runbooks operational | Independent review, load tests, drills and release approval |

## Private beta plan

This is a planning estimate based on approximately 2–3 development hours per day. The target is an 8–10 week private-beta window, not a committed delivery date; actual timing depends on implementation, testing and deployment findings. This plan prioritizes the approved R1 scope and does not itself change product requirements.

### Beta launch gates

1. Complete workspace creation and server-side workspace RBAC, including cross-workspace isolation tests.
2. Implement projects and project-level access control.
3. Implement task management and enforce personal-task privacy.
4. Add comments and activity tracking.
5. Implement basic persistent notifications with resource authorization.
6. Integrate frontend authentication and a core dashboard.
7. Integrate workspace, project and task flows in the frontend.
8. Complete end-to-end, security and negative authorization testing.
9. Deploy and verify an isolated private-beta environment, including secrets, trusted proxy/rate-limit configuration, monitoring and backup/restore expectations.
10. After launch, onboard a small initial cohort and collect feedback; this is a beta validation activity, not a prerequisite to the first deployment.

### Deferred beyond private beta

Direct/group messaging, advanced analytics, payments/billing and advanced automation remain deferred unless product scope is explicitly revisited. Project-scoped chat and other R1 features should not be confused with direct messaging or advanced analytics.

## Priorities

P0 = MVP/security prerequisite; P1 = important follow-up; P2 = later/optional. Do not move later features into R1 without documenting value, dependencies, security/data impact and revised acceptance criteria. No completion percentages are estimated.
