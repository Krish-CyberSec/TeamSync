# Database Schema

> R1 baseline frozen 2026-11-13; this page distinguishes the current schemas from planned collections.

## Current implementation status
The implemented `User` model stores `name`, `email`, `passwordHash` (`select: false`), `status` (`active`, `suspended`, or `deleted`) and Mongoose timestamps. Email is trimmed/lowercased, regex-validated, and declares a unique index. A save hook hashes modified passwords with bcrypt cost 12; `comparePassword` checks candidates. Email verification, profile fields, and soft-delete metadata are still planned.

The implemented `Session` model has a required User reference, required indexed `familyId`, required hidden unique `tokenHash`, `expiresAt`, nullable `revokedAt`, nullable `replacedBySession`, nullable `lastUsedAt`, timestamps, and a TTL index on `expiresAt`. The TTL index asynchronously cleans up expired records; it is not an authorization check. Auth services create sessions, store SHA-256 token digests, rotate sessions transactionally, revoke active family members on a matching replay, and revoke a single session at logout. Access JWTs use the corresponding Session `_id` as `sid`; protected requests require that session to exist, be unrevoked, and be unexpired.

The `Workspace` model stores required `name` (trimmed, 2–80 characters), required `slug` (trimmed, lowercase and unique; lowercase letters, digits and hyphens), `status` (`ACTIVE` or `DELETED`, default `ACTIVE`), nullable `deletedAt` (default `null`), optional `description` (trimmed, max 500, default `""`), required `createdBy` reference to User, and timestamps. The API validation additionally constrains the slug to 2–80 characters and single-hyphen-separated lowercase alphanumeric segments.

The `WorkspaceMember` model represents both active memberships and pending invitations. It stores required `workspace` and `user` references, required `role` (`OWNER`, `ADMIN`, `MANAGER`, `MEMBER`; default `MEMBER`), required `status` (`PENDING`, `ACCEPTED`, `DECLINED`; default `ACCEPTED`), nullable `invitedBy` (User reference), `acceptedAt` (default current time), nullable `declinedAt`, nullable `joinedAt`, and Mongoose timestamps. The unique compound index `{ workspace: 1, user: 1 }` allows at most one membership/invitation record for a user in a workspace, regardless of status.

`workspace.validation.js` requires a strict create object: trimmed `name` (2–80), lowercase trimmed `slug` (2–80, letters/digits/single hyphens), and optional trimmed `description` (max 500, default empty). The strict update object permits only `name` and/or `description`; at least one must be supplied. Invitation input validates and normalizes an email but uses a non-strict Zod object. `workspace.service.js` creates a Workspace and its creator's `OWNER` WorkspaceMember inside one MongoDB transaction. The mounted API supports create, accepted-member-scoped list/details/member listing, OWNER/ADMIN updates and invitation creation, and OWNER-only soft deletion. Physical MongoDB index creation and transaction behavior against a live database were not independently verified in this documentation update.

### Workspace membership and invitation lifecycle

- **Workspace creation:** the creator's WorkspaceMember is created in the same transaction as the workspace with `role: OWNER`, `status: ACCEPTED`, and both `acceptedAt` and `joinedAt` set.
- **Invitation creation:** an OWNER or ADMIN can invite an already-registered user. The service creates a WorkspaceMember with `role: MEMBER`, `status: PENDING`, `invitedBy` set to the inviter, and `acceptedAt`, `declinedAt`, and `joinedAt` cleared. If a matching membership is `DECLINED`, that same row is reset to this pending state. There is no separate Invitation model, token, expiration, or email delivery in the current implementation.
- **Accepted membership:** an accepted member may access implemented workspace reads, including member listing. Workspace update/delete and invitation creation additionally require the specific role described in the API and security documentation.
- **Pending/declined states:** a pending invitation is not an active membership and must not grant access to workspace resources. Current membership queries explicitly require `status: ACCEPTED`; declined rows likewise do not authorize access. No accept/decline API currently transitions these states.

This state model separates invitation intent from authorization while preserving the unique workspace/user constraint. A valid JWT establishes identity only; an `ACCEPTED` WorkspaceMember is the required workspace authorization relationship. Role checks remain an additional authorization boundary.

### Existing membership status backfill

`backend/scripts/migrations/001-backfill-workspace-membership-status.js` connects to the database selected by `MONGO_URI` and updates `workspacemembers` records whose `status` field is absent. It sets `status` to `ACCEPTED` and copies the existing `joinedAt` value to `acceptedAt`; it does not change `joinedAt`, `role`, or records that already have a status. It prints matched/modified counts and sets a failing exit code if the migration errors. There is no dedicated package script or dry-run mode.

Run it from `backend/` only after verifying that `MONGO_URI` selects the intended database and taking an appropriate backup:

```powershell
node scripts/migrations/001-backfill-workspace-membership-status.js
```

This is a data migration, not an integration test. The schema's unique compound index is declared in the model; this migration does not create or verify that index in MongoDB.

## Implemented models

The four schemas above (`User`, `Session`, `Workspace`, and `WorkspaceMember`) exist in source. Four workspace integration files cover creation/listing, details, updates and deletion; they do not cover workspace-member listing or invitation creation. The developer reports the workspace regression suite passed, but it was not independently rerun for this documentation update.

## Planned R1 fields and collection designs

- **User:** implemented fields are name, normalized unique email, passwordHash (`select:false`), status and timestamps. Planned additions include emailVerifiedAt, avatar, bio, deletedAt and lastSeen.
- **Session:** implemented fields are user → User, familyId, tokenHash (`select:false`, unique), expiresAt, revokedAt, replacedBySession → Session, lastUsedAt and timestamps. Store only a cryptographic hash of refresh tokens; never store raw tokens. Family rotation/replay behavior is implemented in the auth service; see the [security model](13_SECURITY_AND_ACCESS.md).
- **Invitation lifecycle beyond current scope:** The approved target remains an email-bound, single-use invitation with a token hash, seven-day expiry, and resend/revoke state. No separate Invitation model exists. Current invitations are pending WorkspaceMember rows linked to registered User records; token hashing, expiry, email delivery, acceptance, decline, resend and revocation are not implemented.
- **Project:** workspace, name, description, key, status, dates, createdBy, visibility (`PRIVATE` in R1), timestamps.
- **ProjectMember:** project, user, explicit project role/permission (including manager authority where granted), status, addedBy, timestamps.
- **Task:** nullable project for personal task, owner/creator, assignedTo[], title, description, status, priority, labels, dueDate, position, timestamps. Personal tasks require owner and no project; project tasks require valid project context.
- **TaskComment:** task, author, content, timestamps.
- **Conversation:** R1 project conversation context and project reference; membership derived from project authorization unless a separate participant policy is defined.
- **Message:** conversation, sender, content, timestamps. R1 project chat only.
- **Notification:** recipient, type, title, message, entityType/entityId, isRead, timestamps.
- **Activity:** workspace/project, actor, action, entityType/entityId, metadata, createdAt; avoid secrets and sensitive payloads.

## Deferred collections
Event, Reminder, Attachment, Document, TimeEntry, ProjectTemplate, direct/group Conversation variants and advanced UserPreference fields are staged; add only when their release is approved.

## Relationships

The User/Session/Workspace/WorkspaceMember relationships exist in current model definitions; the remaining relationships below describe planned collections. A user-to-workspace relationship is represented by WorkspaceMember rather than a direct embedded workspace list on User.

User 1—N Session; User 1—N WorkspaceMember; Workspace 1—N WorkspaceMember; Workspace 1—N Project; Project 1—N ProjectMember; Project 1—N Task; personal Task belongs to one owner and has no project; Task 1—N TaskComment; project Conversation 1—N Message; User 1—N Notification; Workspace/Project 1—N Activity.

## Index declarations and planned index targets

The following indexes are declared in the implemented models; creation in a live database has not been verified:

- User `{ email: 1 }` unique (normalized email).
- Workspace `{ slug: 1 }` unique (declared by the model).
- WorkspaceMember `{ workspace: 1, user: 1 }` unique (declared by the model).
- Session `{ user: 1 }`, `{ familyId: 1 }`, unique `{ tokenHash: 1 }`, and TTL `{ expiresAt: 1 }`.

The following are planned index targets for collections that do not yet have models:

- ProjectMember `{ project: 1, user: 1 }` unique.
- Invitation `{ tokenHash: 1 }` unique; `{ workspace: 1, inviteeEmail: 1, status: 1 }` for lookup; expiry index/cleanup policy.
- Project `{ workspace: 1, createdAt: -1 }`.
- Task `{ project: 1, status: 1, position: 1 }`; `{ assignedTo: 1, status: 1 }`; `{ owner: 1, project: 1, dueDate: 1 }` as query patterns warrant.
- Message `{ conversation: 1, createdAt: -1 }`.
- Activity `{ workspace: 1, createdAt: -1 }` and project-scoped query index as required.

Validate index creation, query patterns and explain plans before relying on schema declarations. Soft-delete and retention jobs must be designed before destructive cascades.
