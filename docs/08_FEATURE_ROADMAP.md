# Feature Roadmap

**R1 baseline frozen:** 2026-11-13

## Release 1 — Essential usable product (P0)
- Backend foundation, registration/email verification, auth, session management and profile basics.
- Workspaces, WorkspaceMember, seven-day invitations and RBAC.
- Private-by-default projects, ProjectMember and project-scoped permissions.
- Tasks, Kanban workflow, comments and checklists.
- My Day and private personal tasks (no sharing).
- Project-scoped chat (no direct/group messaging).
- Basic notifications, activity and authorized analytics.
- Responsive frontend, design system and dark/light themes.
- Security baseline: rotating refresh sessions, CSRF protection, tenant isolation and audit coverage.

## Release 2 — Productivity and collaboration
Calendar/events, recurring tasks, advanced reminders, direct/group messaging, knowledge base, universal search, command palette, time tracking, file attachments, advanced notification preferences and templates.

## Release 3 — Advanced
Google Calendar/GitHub integrations, MFA, advanced reporting, custom roles, automation, AI insights and optional billing.

## Current implementation progress (2026-11-14)

Status definitions: **COMPLETED** = implemented and verified; **IMPLEMENTED** = code exists but is not fully integrated or end-to-end verified; **IN PROGRESS** = partially implemented; **PLANNED** = not implemented.

| Feature | Status | Evidence / limitation |
|---|---|---|
| Backend project foundation | COMPLETED | ES-module Express app/server, middleware and routes exist; health/API smoke checks passed. Live MongoDB-backed startup has not been verified. |
| Environment validation | COMPLETED | dotenv + Zod schema loaded during smoke checks; JWT secrets must each be at least 32 characters. |
| MongoDB connection setup | IMPLEMENTED | Mongoose connect is awaited before listening; no live database connection was verified. |
| Health endpoint | COMPLETED | `GET /api/v1/health` returned HTTP 200 in a smoke check. |
| User model | COMPLETED | Schema and bcrypt hooks exist; owner reports hash verification in MongoDB. |
| bcrypt password hashing | COMPLETED | Save hook uses cost 12; owner reports successful MongoDB check. |
| Registration validation and API | COMPLETED | Strict Zod schema and route exist; smoke validation returned 400; owner reports successful Postman registration 201. |
| Duplicate-email handling | COMPLETED | Service pre-check and unique index declaration; error handler maps MongoDB duplicate-key errors to 409; owner reports Postman 409. |
| Centralized error middleware | COMPLETED | Mounted in Express; smoke validation returned 400; handles Zod/Mongoose validation and duplicate-key errors. |
| Login validation and API | COMPLETED | Strict schema, controller and service exist; smoke validation returned 400; owner reports Postman login 200 and invalid credentials 401. |
| JWT token utilities | IMPLEMENTED | HS256 sign/verify helpers pass an in-process claim smoke check; not integrated into login or session workflows. |
| Refresh Session model | IMPLEMENTED | Model and indexes are declared; session creation/rotation/revocation workflows are absent and database indexes were not verified live. |
| Token integration with login | PLANNED | Login returns a user DTO only; no token/cookie. |
| Refresh-token rotation and reuse detection | PLANNED | No refresh endpoint or rotation workflow. |
| Logout and session revocation | PLANNED | No logout or revoke endpoint/workflow. |
| Authentication middleware | PLANNED | No protected route middleware is mounted. |
| Workspace/resource authorization | PLANNED | No workspace/project API or authorization layer is implemented. |
| Email verification | PLANNED | Registration does not send or require verification. |
| Automated backend tests | PLANNED | No test script or automated tests; `backend/tests/` contains only a placeholder. |

Owner-reported Postman/MongoDB checks (not independently repeated for this update): registration 201; duplicate email 409; invalid registration 400; password hashing verified in MongoDB; login 200; invalid credentials 401. These are manual checks, not automated test coverage.

## Priority
P0 = MVP/security prerequisite; P1 = important follow-up; P2 = later/optional.

Do not move later features into R1 without documenting value, dependencies, security/data impact and revised acceptance criteria.
