# Testing Strategy

**R1 baseline:** frozen 2026-11-13. Add tests with each implementation ticket; do not claim a test passed unless it was run.

## Current backend validation status
As of 2026-11-14, the backend has no automated test files or `test` script. The active health and registration routes, validation failures, duplicate-email behavior, password hashing, configuration failures, and database connection/startup behavior still need automated coverage. Do not treat syntax checks or a manual health request as a substitute for these tests.

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
