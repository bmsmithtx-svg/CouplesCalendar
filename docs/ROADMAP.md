# CouplesCalendar Phase 1 Roadmap

## Purpose

This roadmap is the authoritative Phase 1 sequence for CouplesCalendar. Milestones must not be
reordered, combined, skipped, renamed, or implemented early without owner approval.

Milestone 0 is complete and owner-approved. Milestone 1 is the only currently authorized milestone.
Milestones 2 through 11 are not started and are unauthorized until the prior milestone is reviewed
and approved.

## Locked Sequence

0. **Repository and Workspace Foundation**
1. **Product Contract, UX, Architecture, and Data Design**
2. **Application Shell and Mobile-First Design System**
3. **Authentication and User Profiles**
4. **Couple Creation, Invitation, and Membership Security**
5. **Shared Calendar Viewing**
6. **Event Creation and Management**
7. **Recurrence, Categories, Search, and Filters**
8. **Realtime Collaboration and Conflict Handling**
9. **Reminders, Notifications, PWA, and Offline Behavior**
10. **Security, Accessibility, and Automated Quality Gates**
11. **Production Deployment and Release Validation**

## Milestone Details

### 0. Repository and Workspace Foundation

Status: complete and owner-approved.

Objective: establish a clean React, TypeScript, Vite, Tailwind CSS, and validation foundation.

Required outcomes:

- Repository exists at `https://github.com/bmsmithtx-svg/CouplesCalendar`.
- Canonical local path is `/Users/bmsm1th/Documents/CouplesCalendar`.
- The app renders the approved foundation screen.
- TypeScript, ESLint, Prettier, Vitest, Vite build, and GitHub Actions validation are configured.
- `.env.example` documents future browser-safe Supabase variables.

Explicit exclusions:

- Authentication.
- Supabase project creation.
- Database schema or migrations.
- Couple membership.
- Calendar views.
- Event workflows.
- PWA service workers.
- Production deployment.

Acceptance gate:

- Owner approval of the foundation screen and validation setup.

Dependencies:

- None.

### 1. Product Contract, UX, Architecture, and Data Design

Status: currently authorized.

Objective: create the authoritative product, UX, architecture, data, security, and roadmap contracts
that later milestones must implement.

Required outcomes:

- `docs/PRODUCT_SPEC.md` defines the Phase 1 product contract.
- `docs/ARCHITECTURE.md` defines the lightweight React and Supabase architecture.
- `docs/DATA_MODEL.md` defines the PostgreSQL/Supabase schema design and RLS matrix.
- `docs/SECURITY.md` defines the Phase 1 security model and threat controls.
- `docs/ROADMAP.md` records this locked sequence.
- `README.md` links the milestone documents and accurately reports the current state.

Explicit exclusions:

- Runtime feature implementation.
- Supabase project creation.
- Migrations or database tables.
- Authentication.
- Routing or application screens.
- FullCalendar installation or configuration.
- Realtime subscriptions.
- PWA service worker behavior.
- Production deployment.

Acceptance gate:

- Required documents exist, are internally consistent, pass formatting and validation, and are
  owner-reviewed before Milestone 2 begins.

Dependencies:

- Milestone 0 complete and owner-approved.

### 2. Application Shell and Mobile-First Design System

Status: not started; unauthorized until Milestone 1 is reviewed and approved.

Objective: implement the responsive application shell and reusable design system foundations without
feature workflows.

Required outcomes:

- Mobile-first app frame.
- MacBook layout primitives.
- Accessible navigation placeholders.
- Reusable buttons, fields, dialogs, sheets, banners, and loading states.
- Design tokens and Tailwind conventions aligned with the product spec.

Explicit exclusions:

- Authentication implementation.
- Supabase data access.
- Couple workflows.
- Calendar data.
- Event forms.
- Realtime.
- PWA service worker behavior.

Acceptance gate:

- Responsive shell and UI primitives are validated on phone and MacBook viewports with automated
  checks and owner review.

Dependencies:

- Milestone 1 approved.

### 3. Authentication and User Profiles

Status: not started; unauthorized until Milestone 2 is reviewed and approved.

Objective: implement Supabase Auth integration and minimum user profile setup.

Required outcomes:

- Supabase Auth client integration.
- Sign up, sign in, sign out, and session restoration.
- Profile creation and editing for display name and default timezone.
- Route guards for signed-out, profile-incomplete, and signed-in states.
- RLS-protected profile access.

Explicit exclusions:

- Couple creation.
- Invitation acceptance.
- Calendar views.
- Events.
- Realtime collaboration.
- PWA notifications.

Acceptance gate:

- Auth and profile workflows pass validation, tests, and security review against the contracts.

Dependencies:

- Milestone 2 approved.

### 4. Couple Creation, Invitation, and Membership Security

Status: not started; unauthorized until Milestone 3 is reviewed and approved.

Objective: implement the exactly-two-member couple workspace lifecycle.

Required outcomes:

- Create-couple flow for authenticated users with complete profiles.
- First active member creation.
- Secure one-time invitation creation.
- Invitation expiration, revocation, and invalid-link handling.
- Atomic invitation acceptance.
- Database enforcement of at most two active members per couple.
- Database enforcement of one active couple per user.
- Membership exit and safe couple deletion behavior.

Explicit exclusions:

- Calendar grid implementation.
- Event management.
- Recurrence.
- Realtime event sync.
- Browser notifications.
- External calendar integrations.

Acceptance gate:

- Concurrency and RLS tests prove the member cap and one-active-couple invariant cannot be bypassed.

Dependencies:

- Milestone 3 approved.

### 5. Shared Calendar Viewing

Status: not started; unauthorized until Milestone 4 is reviewed and approved.

Objective: implement private shared calendar reading for active couple members.

Required outcomes:

- FullCalendar installed and configured.
- Phone month-to-agenda calendar view.
- MacBook calendar with intentional use of wider layout.
- Visible range data loading.
- Empty, loading, permission, offline, reconnecting, and failure states.
- Couple-scoped event read model prepared for later event creation.

Explicit exclusions:

- Event create/edit/delete workflows.
- Recurrence editing.
- Realtime updates.
- Reminder delivery.
- External calendar synchronization.

Acceptance gate:

- Both members see the same private calendar data and no other couple's data under RLS.

Dependencies:

- Milestone 4 approved.

### 6. Event Creation and Management

Status: not started; unauthorized until Milestone 5 is reviewed and approved.

Objective: implement all-day and timed event creation, details, editing, and deletion.

Required outcomes:

- Event details screen or panel.
- Event create/edit form.
- All-day and timed event validation.
- UTC plus IANA timezone handling.
- Location, description, and category association fields.
- Soft delete behavior.
- Optimistic concurrency field included in event writes.

Explicit exclusions:

- Recurring event implementation.
- Category management beyond existing association if not yet implemented.
- Search and filters.
- Realtime conflict UI.
- Notifications.

Acceptance gate:

- Active couple members can manage valid events and cannot write across couple boundaries.

Dependencies:

- Milestone 5 approved.

### 7. Recurrence, Categories, Search, and Filters

Status: not started; unauthorized until Milestone 6 is reviewed and approved.

Objective: complete event organization and discovery.

Required outcomes:

- Category management with couple-scoped colors.
- Search across title, location, description, and category name.
- Filters for category, date range, all-day/timed, recurrence, and reminders.
- RFC 5545-style recurrence creation.
- Deterministic recurrence expansion for visible ranges.
- One-occurrence edit and delete through occurrence overrides.
- Entire-series edit and delete.

Explicit exclusions:

- External calendar import/export.
- More than two members.
- AI scheduling.
- Complex distributed conflict resolution.

Acceptance gate:

- Recurring and overridden occurrences render correctly in FullCalendar and remain couple-isolated.

Dependencies:

- Milestone 6 approved.

### 8. Realtime Collaboration and Conflict Handling

Status: not started; unauthorized until Milestone 7 is reviewed and approved.

Objective: implement partner updates and stale-edit protection.

Required outcomes:

- Supabase Realtime subscriptions scoped to the active couple.
- Duplicate subscription prevention.
- Calendar cache invalidation and re-fetching.
- Reconnect revalidation.
- Conflict detection using `version` or validated `updated_at`.
- User-facing conflict state for stale edits.

Explicit exclusions:

- Offline mutation queue.
- Automatic multi-device merge.
- External calendar sync.
- Custom application server.

Acceptance gate:

- Partner changes appear reliably, and stale saves cannot silently overwrite newer event data.

Dependencies:

- Milestone 7 approved.

### 9. Reminders, Notifications, PWA, and Offline Behavior

Status: not started; unauthorized until Milestone 8 is reviewed and approved.

Objective: implement reminders, browser notification preferences, installable PWA behavior, and
limited offline behavior.

Required outcomes:

- User notification preferences.
- Event reminder data.
- Browser notification permission flow after user intent.
- In-app reminder surfaces.
- `vite-plugin-pwa` configuration.
- Installable manifest and service worker.
- Offline shell loading.
- Stale cached state labeling.
- Reconnect revalidation.

Explicit exclusions:

- SMS notifications.
- Server push infrastructure.
- Complex offline mutation queues.
- Distributed conflict resolution.
- External calendar synchronization.

Acceptance gate:

- Installed app behavior, notification states, cache restrictions, and reconnect behavior match the
  product and security contracts.

Dependencies:

- Milestone 8 approved.

### 10. Security, Accessibility, and Automated Quality Gates

Status: not started; unauthorized until Milestone 9 is reviewed and approved.

Objective: harden the completed Phase 1 feature set and expand automated quality gates.

Required outcomes:

- Security review against `docs/SECURITY.md`.
- RLS policy coverage tests where practical.
- Accessibility review of primary workflows.
- Keyboard and screen-reader checks for core screens.
- Responsive visual checks for phone and MacBook layouts.
- Expanded unit and integration tests for implemented features.
- CI validation remains green.

Explicit exclusions:

- New product features.
- External calendar integrations.
- Production deployment changes beyond validation preparation.

Acceptance gate:

- Security, accessibility, and automated quality checks pass for the complete Phase 1 feature set.

Dependencies:

- Milestone 9 approved.

### 11. Production Deployment and Release Validation

Status: not started; unauthorized until Milestone 10 is reviewed and approved.

Objective: deploy and validate the Phase 1 CouplesCalendar release.

Required outcomes:

- Production hosting selected and configured.
- Production Supabase environment configured.
- Environment variables set securely.
- Build and deployment validation.
- Smoke testing of core workflows.
- Release notes and rollback expectations.
- Final owner validation.

Explicit exclusions:

- Scope expansion beyond Phase 1.
- External calendar synchronization.
- Payments.
- Native apps.
- Enterprise administration.

Acceptance gate:

- Production release is deployed, smoke-tested, and owner-approved.

Dependencies:

- Milestone 10 approved.

## Scope Guard

Only the current authorized milestone may be implemented. Completing this roadmap document does not
authorize Milestone 2. No future milestone begins until the prior milestone is reviewed and approved.
