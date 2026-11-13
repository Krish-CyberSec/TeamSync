# API Documentation

> R1 baseline frozen 2026-11-13. This document distinguishes active endpoints from planned contracts; update exact schemas and behavior as implementation progresses.

## Conventions
Base `/api/v1`; JSON by default; validate body/params/query; bounded pagination. Success: `{ "success": true, "data": {} }`. Error: `{ "success": false, "error": { "code": "...", "message": "..." } }`.

## Authentication/session rules
Access JWT is short-lived (10–15 minutes) and held in browser memory. Refresh token is in an HttpOnly/Secure cookie, rotated on use and backed by server-side session state; cookie flows require CSRF protection. Logout revokes the current session. Reuse of a rotated refresh token revokes the session family. Never log tokens.

## Status codes
200, 201, 400, 401, 403, 404, 409, 422, 429, 500.

## Implemented endpoints (verified 2026-11-14)

### Health
- `GET /health` — returns HTTP 200 with `{ "success": true, "message": "TeamSync backend is running" }`.

### Registration
- `POST /auth/register`
- Request: strict JSON object with `name` (trimmed, 2–80 characters), `email` (trimmed, valid email, normalized to lowercase), and `password` (at least 12 characters and at most 72 UTF-8 bytes). Unknown fields are rejected by the Zod schema.
- Success: HTTP 201 with `{ "success": true, "message": "Account registered successfully", "data": { "user": { "id", "name", "email", "status", "createdAt" } } }`. The password or password hash is not returned.
- Existing email: HTTP 409.
- The endpoint creates an account but does not verify the email or issue a login/session token. A centralized error middleware is not implemented, so validation and other error response shapes are not yet a stable API contract.

## Planned R1 groups
- Auth: POST `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`; GET `/auth/me`.
- Users: GET/PATCH `/users/me`; GET `/users/me/sessions`; DELETE `/users/me/sessions/:sessionId`; DELETE `/users/me` (account deletion request).
- Workspaces: POST/GET `/workspaces`; GET/PATCH/DELETE `/workspaces/:id` (DELETE OWNER-only and soft-delete-first).
- Members/invitations: POST `/workspaces/:id/invitations`; GET `/workspaces/:id/invitations`; POST `/invitations/:token/accept`; POST `/workspaces/:id/invitations/:invitationId/resend`; DELETE `/workspaces/:id/invitations/:invitationId`; GET `/workspaces/:id/members`; PATCH/DELETE `/workspaces/:id/members/:userId`.
- Projects: POST/GET `/workspaces/:workspaceId/projects`; GET/PATCH/DELETE `/projects/:id`; POST/GET `/projects/:id/members`; PATCH/DELETE `/projects/:id/members/:userId`.
- Tasks: POST/GET `/projects/:projectId/tasks`; POST/GET `/tasks/personal`; GET/PATCH/DELETE `/tasks/:id`; PATCH `/tasks/:id/status`.
- Comments: POST/GET `/tasks/:taskId/comments`; PATCH/DELETE `/comments/:id`.
- Notifications: GET `/notifications`; PATCH `/notifications/:id/read`; PATCH `/notifications/read-all`.
- Project chat: GET `/projects/:projectId/conversation/messages`; POST `/projects/:projectId/conversation/messages` (only authorized project members).
- Dashboard: GET `/dashboard/me`; GET `/dashboard/workspace/:id`.

## Authorization contract
Every endpoint documents required identity, active workspace membership, project membership/visibility, action permission and resource ownership. Workspace OWNER/ADMIN can administer projects in their workspace. MANAGER requires explicit project manager authority. Ordinary members need active ProjectMember access. Personal tasks are owner-only. Return a consistent 403 or 404 according to resource-disclosure policy; never rely on client-supplied workspace IDs without validating resource ancestry.

For each endpoint document auth, permission, schemas, success/errors, pagination, side effects and tests. Breaking changes require coordinated frontend/docs/tests updates.
