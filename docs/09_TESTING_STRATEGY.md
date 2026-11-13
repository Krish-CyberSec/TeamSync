# Testing Strategy

**R1 baseline:** frozen 2026-11-13. Add tests with each implementation ticket; do not claim a test passed unless it was run.

## Current backend validation status (2026-11-14)
There is no backend `test` script or automated test suite; `backend/tests/` contains only a placeholder. In this documentation update, `node --check` passed for 14 backend JavaScript files. An in-process smoke check confirmed health 200, registration/login Zod validation 400, and JWT sign/verify claims. This did not connect to MongoDB.

The project owner reports manual Postman/MongoDB checks for registration 201, duplicate email 409, invalid registration 400, password hashing in MongoDB, login 200, and invalid credentials 401. These are owner-reported manual checks, not automated coverage and were not independently repeated during this documentation update.

Automated coverage is still required for successful database-backed registration/login, duplicate-key races, password hashing/comparison, inactive account behavior, every error-middleware branch, JWT expiry/type/issuer/algorithm rejection, Session indexes/TTL behavior, and configuration failure paths. A live MongoDB connection and server startup were not verified.

## Backend unit tests
Services, permission decisions, project visibility, manager authority, task transitions/assignment eligibility, validators, invitation token lifecycle, refresh-token rotation/reuse detection, session revocation and retention-job eligibility.

## Backend integration tests
Registration/email verification/login/logout/refresh; workspace creation and OWNER membership atomicity; invitation create/resend/revoke/accept/expiry/idempotency; project CRUD and ProjectMember permissions; tasks/personal task privacy; comments; project chat; notifications and activity; account/workspace soft deletion.

## Security regression tests
- Unauthenticated protected request is rejected.
- Expired, tampered, wrong-type and revoked tokens are rejected.
- Reuse of rotated refresh token revokes its session family.
- CSRF protection rejects invalid cookie-authenticated state-changing requests.
- Cross-workspace read/write by ID guessing is denied.
- Workspace MEMBER cannot access a private project without ProjectMember.
- OWNER/ADMIN project administration is limited to their own workspace.
- MANAGER cannot manage projects without explicit manager authority.
- MEMBER cannot invoke workspace administration; ADMIN cannot self-promote to OWNER.
- Invitation token is single-use, email-bound, hashed at rest and rejected after seven days or revocation.
- Personal task IDs cannot be used by another user.
- Assignment to unauthorized users/projects is rejected.
- Mass assignment is blocked.
- Notification recipient isolation and linked-resource re-authorization are enforced.
- Unauthorized Socket.IO room joins/events fail.
- Project chat is inaccessible to non-members.
- Logs contain no passwords, raw tokens or secrets.

## Frontend
Component tests for UI primitives; page tests for loading/empty/error/success states; form/filter/dialog/drag-drop interactions; theme and responsive behavior; role-aware UI and API error handling. UI tests do not replace backend authorization tests.

## End-to-end scenarios
Register and verify; login; create workspace and OWNER membership; invite/accept member; verify roles; create private project; grant ProjectMember access; verify non-member denial; create task/comment/chat message; verify activity/notification; test personal task privacy; revoke session; verify refresh failure; test account deletion recovery path.

## Operational tests and quality gates
Verify backup restore in a non-production environment. Test retention jobs against fixtures before enabling destructive execution. Run relevant tests, include negative authorization paths, ensure no secrets committed, and verify docs match implementation.
