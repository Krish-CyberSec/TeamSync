# Database Schema

> Planning schema; refine exact fields and migrations during implementation. R1 baseline frozen 2026-11-13.

## Current implementation status
The implemented `User` model stores `name`, `email`, `passwordHash` (`select: false`), `status` (`active`, `suspended`, or `deleted`) and Mongoose timestamps. Email is trimmed/lowercased, regex-validated, and declares a unique index. A save hook hashes modified passwords with bcrypt cost 12; `comparePassword` checks candidates. Email verification, profile fields, and soft-delete metadata are still planned.

The implemented `Session` model has a required User reference, required indexed `familyId`, required hidden unique `tokenHash`, `expiresAt`, nullable `revokedAt`, nullable `replacedBySession`, nullable `lastUsedAt`, timestamps, and a TTL index on `expiresAt`. The TTL index asynchronously cleans up expired records; it is not an authorization check. Auth services create sessions, store SHA-256 token digests, rotate sessions transactionally, revoke active family members on a matching replay, and revoke a single session at logout. Physical MongoDB index creation and live transaction execution were not verified in this documentation update.

## R1 collections
- **User:** implemented fields are name, normalized unique email, passwordHash (`select:false`), status and timestamps. Planned additions include emailVerifiedAt, avatar, bio, deletedAt and lastSeen.
- **Session:** implemented fields are user → User, familyId, tokenHash (`select:false`, unique), expiresAt, revokedAt, replacedBySession → Session, lastUsedAt and timestamps. Store only a cryptographic hash of refresh tokens; never store raw tokens. Family rotation/replay behavior is implemented in the auth service; see the [security model](13_SECURITY_AND_ACCESS.md).
- **Workspace:** name, description, createdBy → User, deletedAt, timestamps.
- **WorkspaceMember:** workspace → Workspace, user → User, role (`OWNER/ADMIN/MANAGER/MEMBER`), status, joinedAt, timestamps.
- **Invitation:** workspace, normalized invitee email, intended role, tokenHash, expiresAt, status, invitedBy, resentAt/revokedAt, timestamps. Single-use; seven-day expiry.
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
User 1—N Session; User 1—N WorkspaceMember; Workspace 1—N WorkspaceMember; Workspace 1—N Project; Project 1—N ProjectMember; Project 1—N Task; personal Task belongs to one owner and has no project; Task 1—N TaskComment; project Conversation 1—N Message; User 1—N Notification; Workspace/Project 1—N Activity.

## Required indexes
- User `{ email: 1 }` unique (normalized email).
- WorkspaceMember `{ workspace: 1, user: 1 }` unique.
- ProjectMember `{ project: 1, user: 1 }` unique.
- Invitation `{ tokenHash: 1 }` unique; `{ workspace: 1, inviteeEmail: 1, status: 1 }` for lookup; expiry index/cleanup policy.
- Project `{ workspace: 1, createdAt: -1 }`.
- Task `{ project: 1, status: 1, position: 1 }`; `{ assignedTo: 1, status: 1 }`; `{ owner: 1, project: 1, dueDate: 1 }` as query patterns warrant.
- Message `{ conversation: 1, createdAt: -1 }`.
- Activity `{ workspace: 1, createdAt: -1 }` and project-scoped query index as required.
- Session `{ user: 1 }`, `{ familyId: 1 }`, unique `{ tokenHash: 1 }`, and TTL `{ expiresAt: 1 }` indexes are declared in the current model.

Validate indexes against actual query patterns and explain plans. Soft-delete and retention jobs must be designed before destructive cascades.
