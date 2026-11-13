# Product Requirements Document

**Status:** BASELINE FROZEN — Release 1  
**Approved:** 2026-11-13

## Product summary
TeamSync is a multi-workspace collaboration and personal productivity web application. One account supports personal productivity and collaboration across multiple workspaces.

## R1 goals and scope
R1 delivers a usable, secure core product:
- Registration, login, logout, password recovery, verified email, profile basics and session management.
- Multiple workspaces per user, workspace switching, invitations, membership administration and baseline RBAC.
- Projects with explicit project membership and private-by-default visibility.
- Tasks, Kanban workflow, task assignment, comments and checklists.
- My Day and private personal tasks.
- Project chat (project-scoped only; no direct or group messaging in R1).
- Basic persistent notifications, activity history and authorized project/workspace/personal analytics.
- Responsive frontend and dark/light themes.

## Accounts and profiles
Users have a single identity across workspaces. Users can update permitted profile fields and preferences. Email verification is required before treating an email address as trusted. Session management supports revocation.

## Workspaces and roles
A user can belong to multiple workspaces and hold a different role in each. Roles are `OWNER`, `ADMIN`, `MANAGER`, `MEMBER`; membership is represented by `WorkspaceMember`.
- OWNER: full workspace control, including ownership transfer and workspace deletion.
- ADMIN: workspace administration, membership and project administration; cannot transfer ownership or promote self to OWNER.
- MANAGER: manage projects for which they have explicit project-level authority.
- MEMBER: collaborate in projects to which they have access and manage their own personal tasks.

## Invitations
Workspace invitations are email-address-bound, single-use and expire seven days after creation. Generate cryptographically random tokens and store only a secure hash. Authorized administrators can resend or revoke pending invitations. Acceptance validates the invitee identity, token, expiry and pending status; membership creation is atomic and idempotent. Email delivery provider remains an implementation choice.

## Projects and visibility
Projects belong to one workspace. **Project visibility is private by default:** ordinary workspace membership does not automatically grant project access. Project access is granted through an active `ProjectMember` relationship. Workspace OWNER and ADMIN can administer all projects in their workspace. MANAGER access is limited to projects where they have explicit manager authority. Project-level checks are required for every read and write.

## Tasks and personal productivity
Project tasks belong to a project and inherit its workspace/project authorization boundary. Personal tasks have no project and are private to their owner in R1; sharing personal tasks is out of scope. Initial workflow: `TODO → IN_PROGRESS → IN_REVIEW → DONE`; the server validates transitions. Task lists are bounded and paginated.

## Communication
R1 includes task comments and project-scoped chat. Direct and group messaging, threads, reactions, pins and richer messaging features are R2. Chat messages must be persisted before real-time broadcast.

## Notifications, activity and analytics
R1 includes persistent notifications for relevant assignments, comments, mentions, invitations and task changes; read state; important activity records; and summaries that include only data the viewer may access.

## Retention and lifecycle baseline
- User account deletion: soft-delete with a 30-day recovery window, then permanently delete or anonymize eligible personal data subject to legal/operational obligations.
- Workspace deletion: OWNER-only, explicit confirmation, soft-delete first; define dependent data disposition and execute a controlled deletion/anonymization workflow.
- Product activity history: 180-day proposed retention.
- Security audit records: 365-day proposed retention, restricted access, no secrets or raw tokens.
- Backups: daily, 30-day retention, with restoration tests. These are approved product defaults and must be validated against applicable legal requirements before production.

## Out of scope for R1
Calendar, recurring tasks, advanced reminders, direct/group messaging, knowledge base, universal search, command palette, file attachments, time tracking, third-party integrations, MFA, advanced reporting, custom roles, automation, AI insights and billing.

## Acceptance principles
- Users can belong to multiple workspaces with different roles.
- Guessing an identifier never grants access across workspace or project boundaries.
- Workspace membership alone does not grant access to private projects.
- Personal tasks are visible only to their owner.
- A MEMBER cannot perform workspace administration; an ADMIN cannot promote themselves to OWNER.
- Invitations are single-use and expire after seven days.
- Task transitions are validated server-side.
- The UI reflects permissions but never substitutes for backend enforcement.
- Critical workflows have automated positive and negative tests.
