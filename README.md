# TeamSync

TeamSync is a multi-workspace collaboration and personal productivity platform.

**Product statement:** One account. Multiple workspaces. Personal productivity. Complete team collaboration.

## Stack baseline
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express.js
- Database: MongoDB + Mongoose
- Auth: JWT access/refresh-token strategy + bcrypt
- Authorization: Workspace membership + RBAC + resource-level checks
- Real-time: Socket.IO
- Validation: Zod
- API: versioned REST under `/api/v1`
- Architecture: modular monolith
- Workspace roles: OWNER, ADMIN, MANAGER, MEMBER
- Membership: separate `WorkspaceMember` collection; unique `(workspace, user)` index
- Themes: dark and light

## Documentation workflow
Read `AGENTS.md`, `PROJECT_CONTEXT.md` and relevant files in `docs/` before coding. Update affected docs, tests, `PROJECT_CONTEXT.md` and `docs/11_CHANGELOG.md` whenever behavior, architecture, schema, API or scope changes.

Never commit secrets. See `.env.example`.

## Current implementation status
As of 2026-11-14, the backend has a partial foundation: Express startup, Zod environment parsing, MongoDB connection, health and registration endpoints, and a bcrypt-backed user model. Login, email verification, JWT/session lifecycle, authorization, centralized error handling, rate limiting, CSRF protection and automated backend tests are not implemented. The approved stack and R1 scope describe the target architecture, not completed functionality. See `PROJECT_CONTEXT.md` and `docs/` for the detailed status and contracts.
