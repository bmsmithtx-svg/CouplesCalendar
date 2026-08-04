# CouplesCalendar Security Design

## Purpose

This document defines the Phase 1 security model for CouplesCalendar. It is a design contract only.
Milestone 1 does not create Supabase projects, policies, migrations, authentication flows, or
runtime security code.

## Security Goals

- Only authenticated users can use the private calendar experience.
- Each active couple workspace is isolated from every other couple workspace.
- A couple can have at most two active members.
- A user can belong to only one active couple workspace in Phase 1.
- Invitation acceptance is one-time, expiring, revocable, and atomic.
- Supabase Row Level Security is the primary authorization boundary.
- Browser code never receives service-role credentials or private secrets.
- Offline and cached states do not misrepresent freshness or leak protected data.

## Authentication Boundary

Supabase Auth is the identity provider for Phase 1. The application trusts Supabase Auth sessions
only after they are returned by the Supabase client and validated by Supabase on each database,
storage, Realtime, or RPC operation.

Authentication states:

- Signed out: no access to private product surfaces or protected data.
- Signed in, profile incomplete: may manage only the user's own profile setup.
- Signed in, no active couple: may create a couple or accept an invitation.
- Signed in, active couple member: may access only that couple's workspace data.

## Session Handling

- The frontend uses Supabase Auth client session management.
- Couple-scoped state is cleared on sign-out.
- Auth state changes trigger re-fetching profile and active membership state.
- Lost or shared devices are contained by sign-out, session expiration, and Supabase Auth controls.
- The app must not store long-lived custom credentials outside Supabase session storage.

## Browser-Safe Configuration

The frontend may expose only browser-safe Supabase values:

- `VITE_SUPABASE_URL`.
- `VITE_SUPABASE_ANON_KEY`.

The frontend must never expose:

- Supabase service-role credentials.
- Database passwords.
- JWT signing secrets.
- Invitation token hashes outside intended server responses.
- Provider secrets or private API tokens.

The anon key is not an authorization boundary. RLS policies and authenticated sessions are the
authorization boundary.

## Authorization Model

### RLS as Primary Boundary

Every protected table must have RLS enabled before feature use:

- `profiles`.
- `couples`.
- `couple_members`.
- `couple_invitations`.
- `event_categories`.
- `events`.
- `event_occurrence_overrides`.
- `event_reminders`.
- `notification_preferences`.

Policies must grant the minimum operation needed for each actor. Client-side filters, route guards,
and hidden controls are usability aids only.

### Cross-Couple Isolation

Couple-scoped tables must include `couple_id`. RLS checks active membership against
`couple_members` before allowing `SELECT`, `INSERT`, `UPDATE`, or `DELETE`. Incoming client-supplied
`couple_id` values are never trusted without RLS and database constraints.

### Exactly-Two-Member Enforcement

The database enforces the cap through:

- An active membership slot constrained to `1` or `2`.
- A partial unique index on `(couple_id, active_member_slot)` for active members.
- A partial unique index on `(user_id)` for active memberships.
- A transaction-safe create-couple operation for the first member.
- A transaction-safe invitation acceptance operation for the second member.

The client may hide invitation creation when a couple is full, but the database remains
authoritative.

## Invitation Security

Invitation links are bearer secrets and must be treated carefully.

Required controls:

- Generate tokens with cryptographically secure randomness.
- Store only a token hash, never reusable plaintext.
- Use a single-use `pending` to `accepted` transition.
- Require an authenticated recipient with a complete profile.
- Reject expired invitations.
- Reject revoked invitations.
- Reject reused or already accepted invitations.
- Reject acceptance if the recipient already has an active couple.
- Reject acceptance if the target couple already has two active members.
- Mark `accepted_by` and `accepted_at` in the same transaction as membership insertion.
- Avoid logging plaintext tokens.
- Show safe invalid-link messages that do not reveal whether a token hash exists.

Acceptance must happen through a database function or RPC with transaction semantics. Direct client
updates to invitation and membership rows are not sufficient.

## Input Validation

Validation happens in both the frontend and database:

- Frontend validation gives fast, legible feedback.
- Database constraints and RLS enforce correctness and isolation.
- Text fields are length-limited and trimmed.
- Couple, profile, category, and event names cannot be empty.
- Category colors must match an approved color format.
- UUIDs from the browser are treated as untrusted identifiers.
- Unexpected database errors are redacted before display.

## Event, Date, Time, and Recurrence Validation

Event validation must enforce:

- Required title.
- Event belongs to exactly one couple.
- Category belongs to the same couple as the event.
- `time_kind` is `all_day` or `timed`.
- All-day events use `start_date` and exclusive `end_date`.
- Timed events use `starts_at` and `ends_at`.
- End does not precede start.
- Timed events and recurring events include a valid IANA timezone.
- Recurrence rules conform to the approved RFC 5545-style subset.
- Recurrence expansion is bounded by query range.
- Occurrence overrides reference a real generated occurrence.
- Reminder targets are active members of the same couple.

Malformed recurrence rules are rejected before storage and again before expansion. Expansion code
must treat stored recurrence rules as untrusted input.

## Realtime Security

- Realtime channels are opened only after authentication and active membership resolution.
- Subscriptions are scoped to the active couple context.
- Realtime policies or publication filters must prevent a user from receiving another couple's row
  changes.
- Payloads are treated as invalidation hints. The app re-fetches through RLS when correctness
  matters.
- Subscriptions are torn down on sign-out, membership exit, or context change.

## Notification Permission Handling

- Browser notification permission is requested only after the user enables or configures reminder
  behavior.
- A denied browser permission is a supported state.
- Notification preferences are user-owned and protected by RLS.
- Reminder rows cannot target users outside the event's couple.
- SMS notifications are outside Phase 1.

## PWA Cache Restrictions

The service worker may cache static shell assets after PWA support is introduced. It must not cache:

- Supabase Auth responses.
- Authenticated table responses.
- RPC responses.
- Invitation tokens.
- User-specific calendar payloads unless a later implementation adds a safe per-user storage design
  with visible stale-state labeling.

Offline UI must identify stale data. Offline writes must not be shown as saved.

## Sensitive-Data Avoidance

CouplesCalendar should avoid collecting sensitive data that is not necessary for a shared calendar.
Event titles, descriptions, locations, reminders, and recurrence details are private couple data and
must be protected accordingly. Logs, tests, screenshots, and error messages should use sample data
that does not expose real private calendar contents.

## Logging and Error Redaction

- Do not log invitation tokens.
- Do not log Supabase sessions or JWTs.
- Do not log service credentials.
- Do not display raw SQL errors to users.
- Convert policy failures into clear states such as permission denied, invitation invalid, couple
  full, or conflict detected.
- Keep developer diagnostics available in local development without leaking secrets to the UI.

## Account, Membership, and Couple Deletion

- Membership exit immediately removes active access to couple data.
- A user deleting their account removes their profile and notification preferences through an
  approved account deletion flow.
- Couple-scoped events remain with the couple unless the couple is deleted.
- Couple deletion removes access for both users and deletes or soft-deletes dependent couple-scoped
  records according to the final migration design.
- Direct destructive client deletes should be minimized; controlled flows should handle side effects
  consistently.

## Dependency and CI Security Expectations

- Use the committed lockfile with `npm ci`.
- Do not add dependencies during Milestone 1.
- Later dependency additions must be justified by product need and reviewed for maintenance risk.
- CI must run format, lint, typecheck, tests, and build.
- No production secrets are committed.
- `.env` files stay untracked.

## Threat Analysis

| Threat                                                      | Control                                                                                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Guessing invitation links                                   | Use high-entropy random tokens, store only hashes, require expiration, and avoid token-specific disclosure in invalid-link errors. |
| Leaking invitation links                                    | Treat links as bearer secrets, allow revocation, expire pending invitations, and mark accepted links one-time.                     |
| Reusing accepted invitations                                | Store accepted status, `accepted_by`, and `accepted_at`; reject any non-pending token in the atomic acceptance RPC.                |
| Concurrently accepting invitations to exceed the member cap | Lock the couple or membership set during acceptance; enforce active member slots and partial unique indexes.                       |
| Modifying a couple identifier in a browser request          | RLS checks active membership for the target `couple_id`; database constraints validate same-couple relationships.                  |
| Reading another couple's Realtime changes                   | Subscribe only after active membership resolution and require Realtime policies or publication filters scoped by RLS.              |
| Injecting malformed recurrence rules                        | Validate RRULE subset before storage, constrain length, reject unsupported fields, and bound expansion ranges.                     |
| Stale offline data                                          | Label offline and stale states, disable or clearly fail network writes, and revalidate after reconnect.                            |
| Exposing secrets through frontend environment variables     | Expose only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; keep service-role credentials out of browser builds.                 |
| Accidentally caching sensitive authenticated responses      | Restrict service worker caching to static assets and avoid caching Supabase Auth, table, and RPC responses.                        |
| Lost or shared devices with active sessions                 | Provide sign-out, rely on Supabase session expiration and revocation controls, and clear couple-scoped local state on sign-out.    |
| Cross-couple category or reminder references                | Use same-couple foreign-key checks or triggers and RLS on writes.                                                                  |
| Silent overwrite during partner edits                       | Require optimistic concurrency with `version` or `updated_at` and show a conflict state when stale.                                |
| Raw database errors exposing implementation details         | Redact errors and map expected failures to safe product states.                                                                    |

## Security Acceptance Criteria

- No Phase 1 feature can function without RLS protecting the underlying table.
- A user cannot access another couple by changing IDs in the browser.
- A couple cannot have more than two active members.
- A user cannot have more than one active couple membership.
- Invitation acceptance is atomic and one-time.
- Frontend builds contain no service-role credentials or private secrets.
- Realtime subscriptions do not expose another couple's data.
- PWA caches do not store authenticated Supabase responses.
- Offline writes do not appear to succeed.
