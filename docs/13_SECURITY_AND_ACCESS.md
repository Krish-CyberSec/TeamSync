# Security and Access Model

**Status:** R1 security baseline frozen — 2026-11-13

## Identity and sessions
- Hash passwords with bcrypt; never store plaintext.
- Normalize and uniquely index email; require verification before treating email as trusted.
- Access JWT lifetime is 10–15 minutes; verify signature, expiry, issuer/audience where configured and token purpose.
- Keep access token in browser memory. Refresh token is delivered in HttpOnly/Secure cookie; protect cookie-authenticated state changes with CSRF controls and strict trusted-origin configuration.
- Track refresh sessions server-side and store only token hashes/opaque identifiers. Rotate on every refresh. Reuse of a rotated token revokes the session family.
- Revoke on logout, password change and security response. Never log credentials, raw tokens or reset/invitation tokens.
- Generic login/reset responses and rate limits reduce account enumeration and credential attacks.

## Authorization model
Authorization chain: verified identity → active WorkspaceMember → workspace permission → ProjectMember/project policy → resource ownership/assignment rule.

- OWNER: full workspace control, ownership transfer and workspace deletion.
- ADMIN: workspace/member/project administration; cannot transfer ownership or promote self to OWNER.
- MANAGER: manage only projects with explicit manager authority.
- MEMBER: collaborate only in projects with active ProjectMember access; manage own personal tasks.

## Project and personal resource privacy
Projects are private by default. Workspace membership alone does not grant ordinary project access. Workspace OWNER/ADMIN can administer all projects in their workspace. MANAGER requires explicit project manager authority. Ordinary members require active ProjectMember. Personal tasks are owner-only and non-shareable in R1.

## Invitations
Email-bound, single-use token; cryptographically random; store only a hash; seven-day expiry; authorized resend/revoke. Acceptance verifies signed-in/verified email identity, token hash, expiry and pending status; create membership atomically and idempotently.

## Tenant isolation / IDOR
Never authorize merely because an ObjectId exists or a JWT is valid. Resolve resource's workspace/project, verify active membership and project policy, then check permission for the requested action. Prefer scoped queries. Apply same filters to search, analytics, notifications, activity and exports.

## API protections
HTTPS in deployed environments; Helmet/security headers; trusted-origin CORS (CORS is not authentication); CSRF protection for cookie flows; rate limits; Zod validation; allowlisted updates; bounded pagination; safe filters/sorts; consistent errors; redacted logs.

## Current backend implementation status (2026-11-14)

Implemented in the current workspace:
- Express uses Helmet, credentialed CORS restricted to `CLIENT_URL`, JSON parsing, and a mounted centralized error handler. CORS is not authentication.
- Registration/login use strict Zod schemas. Registration requires a 12-character password minimum and limits UTF-8 input to bcrypt's 72-byte maximum.
- User passwords are hashed with bcrypt cost 12; `passwordHash` is excluded from ordinary Mongoose queries. The registration/login responses omit the password and hash.
- Error handling maps Zod and Mongoose validation failures to 400, duplicate-key errors to 409, and hides 5xx response messages in production.
- JWT sign/verify utilities use HS256, separate access/refresh secret variables, issuer `teamsync`, subject and token-type claims; access lifetime is 15 minutes, refresh lifetime seven days, and refresh includes `sid`. Env validation requires each secret to be at least 32 characters but does not check that the secret values differ.
- Session schema declares a unique hidden refresh-token hash, expiry/revocation/replacement/last-use fields, timestamps and a MongoDB TTL index.

These components do not complete authentication or authorization. Login returns a user DTO but does not issue tokens or cookies. JWT/session primitives are not integrated; there is no session creation, refresh rotation/reuse detection, logout/revocation, token-to-session check, authentication middleware, workspace authorization, email verification, CSRF protection, or rate limiting. All current endpoints are public.

Known security limitations: registration returns 409 for an existing email; login returns 403 for non-active accounts, which may expose account status. The production response hides 5xx details, but the error middleware logs full 5xx Error objects, while startup/database failures log error messages. Review and redact server logs before production. Live MongoDB startup was not verified during this documentation update. Do not deploy this foundation as a production-ready auth service.

## Files
Private task/chat attachments are deferred from R1. Avatar uploads must use allowlisted types, size limits, generated storage keys and content validation. Never serve untrusted active content from the application origin.

## Socket.IO
Authenticate each connection; authorize room joins and sensitive events; never trust client-provided room names/IDs; validate payloads and rate/size limits; persist messages/state changes before broadcasting.

## Notifications and activity
Users fetch only their own notifications. Opening a notification link requires fresh resource authorization. Activity feeds are filtered by workspace/project policy. Do not put secrets or unnecessary personal data in metadata; restrict security audit access.

## Lifecycle and operational controls
- Account deletion: soft-delete, 30-day recovery, then permanently delete/anonymize eligible data.
- Workspace deletion: OWNER-only, confirmation-gated, soft-delete-first and controlled dependent-data disposition.
- Product activity proposed retention: 180 days.
- Security audit retention: 365 days, restricted access and protected from unauthorized modification.
- Daily backups retained 30 days; restoration tests required.
- Validate retention/deletion against legal obligations before production.

## Required security tests
Cross-workspace IDOR; private project member bypass; manager permission boundaries; privilege escalation; invitation replay/expiry/email mismatch; refresh token rotation/reuse; CSRF; personal task ownership; notification recipient isolation; unauthorized Socket.IO room/event; mass assignment; secret redaction; backup restore and retention-job dry run.

## Deferred
MFA and recovery, private attachment delivery/scanning, formal audit immutability/export, final production retention/legal review.
