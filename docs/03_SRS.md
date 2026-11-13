# Software Requirements Specification

**Status:** BASELINE FROZEN — Release 1 (2026-11-13)

## Functional requirements
- FR-AUTH-001: Register using valid name, email and password; normalize and uniquely constrain email.
- FR-AUTH-002: Require email verification before treating an email as trusted.
- FR-AUTH-003: Authenticate using a short-lived access JWT and server-tracked rotating refresh session.
- FR-AUTH-004: Logout revokes the active session; password change/security action can revoke sessions.
- FR-USER-001: User can view/update only permitted profile fields.
- FR-WS-001: Authorized user can create a workspace; creator OWNER membership is created atomically.
- FR-WS-002: User can list/view only workspaces with active membership.
- FR-WS-003: Workspace deletion is OWNER-only, confirmed and soft-delete-first.
- FR-MEM-001: Authorized OWNER/ADMIN can issue an email-bound workspace invitation.
- FR-MEM-002: Invitation token is random, stored as a hash, single-use and expires after seven days.
- FR-MEM-003: Authorized administrators can resend/revoke pending invitations; acceptance is validated, atomic and idempotent.
- FR-MEM-004: Duplicate `(workspace, user)` membership is prevented.
- FR-PROJ-001: Authorized workspace administrator can create a project.
- FR-PROJ-002: Project is private by default; active ProjectMember grants ordinary project access.
- FR-PROJ-003: Workspace OWNER/ADMIN can administer all projects; MANAGER access is limited to explicitly authorized projects.
- FR-TASK-001: User can create personal or project task.
- FR-TASK-002: Personal tasks are private to owner; sharing is not supported in R1.
- FR-TASK-003: Server validates task transitions and assignment eligibility.
- FR-TASK-004: Task lists are bounded and paginated.
- FR-COM-001: Authorized users can comment on accessible tasks.
- FR-CHAT-001: R1 project chat is scoped to authorized project members; direct/group messaging is excluded.
- FR-NOT-001: Users retrieve only notifications addressed to them; linked resources are re-authorized.
- FR-ACT-001: Important changes create activity records visible only to authorized viewers.
- FR-RT-001: Socket connections are authenticated; room joins and sensitive events are authorized.
- FR-LIFE-001: Account deletion uses a 30-day soft-delete recovery window before permanent deletion/anonymization of eligible data.
- FR-LIFE-002: Workspace deletion is OWNER-only, confirmation-gated and soft-delete-first.

## Non-functional requirements
- NFR-SEC-001: Enforce authorization server-side for every protected resource.
- NFR-SEC-002: Never store plaintext passwords, raw refresh tokens or invitation tokens.
- NFR-SEC-003: Browser refresh token uses HttpOnly/Secure cookie and CSRF protection; access token is held in memory.
- NFR-SEC-004: Production errors do not disclose internals; secrets are redacted from logs.
- NFR-PERF-001: Collection endpoints are paginated and bounded.
- NFR-MAINT-001: Backend separates routes/controllers/services/persistence.
- NFR-TEST-001: Critical auth, authorization, invitation, lifecycle and workflow rules have automated tests.
- NFR-UX-001: Main flows are responsive and support dark/light themes.
- NFR-REL-001: Critical multi-document operations are atomic where supported; real-time events follow durable writes.
- NFR-OPS-001: Daily backups retained for 30 days; restoration is tested.
- NFR-AUD-001: Product activity proposed retention is 180 days; security audit retention is 365 days with restricted access.

## Business rules
- BR-001: User may have different roles in different workspaces.
- BR-002: Membership is represented by WorkspaceMember.
- BR-003: `(workspace, user)` membership pair is unique.
- BR-004: Workspace roles are OWNER, ADMIN, MANAGER, MEMBER.
- BR-005: ADMIN cannot promote self to OWNER or transfer ownership.
- BR-006: JWT proves identity, not resource authorization.
- BR-007: Personal tasks are private by default and non-shareable in R1.
- BR-008: Project visibility is private by default; ProjectMember is required for ordinary member access.
- BR-009: OWNER/ADMIN can administer all projects in their workspace; MANAGER requires explicit project authority.
- BR-010: Invitations are email-bound, single-use and expire after seven days.
- BR-011: Project chat is included in R1; direct/group messaging is R2.
- BR-012: Server validates task workflow and assignment eligibility.

Trace every requirement to tickets, APIs, models, tests and screens as implementation progresses.
