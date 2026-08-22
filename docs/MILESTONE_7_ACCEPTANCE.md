# Milestone 7 Acceptance Notes

## Scope

Milestone 7 adds recurrence, categories, search, and filters to the approved Milestone 6 shared
calendar implementation.

Implemented scope:

- Fixed event categories with labels and swatch colors.
- Category persistence on `calendar_events.category`.
- Daily, weekly, and monthly recurring series.
- Optional recurrence end date.
- RFC 5545-style `RRULE` storage without `DTSTART`.
- Bounded occurrence expansion for the requested visible calendar range.
- Timezone-aware recurrence expansion using the event timezone.
- Series-wide recurring-event edit and soft delete.
- Search across active event title, description, location, and category label.
- Category filters that combine with search and visible calendar rendering.
- Search returns each matching recurring master event once instead of unbounded occurrences.

Explicitly not implemented in Milestone 7:

- Per-occurrence overrides or cancellations.
- "This and future" split-series editing.
- Custom couple-managed category CRUD.
- Reminder filters and notification behavior.
- Realtime collaboration, PWA/offline behavior, and external calendar sync.

## Data Model

Migration `202608170001_milestone_7_recurrence_categories_search.sql` extends
`public.calendar_events` with:

- `category text not null default 'personal'`.
- `recurrence_rule text`.
- `recurrence_ends_at timestamptz`.

The migration constrains category values, constrains supported RRULE syntax, requires recurrence
end helpers to belong to a recurring row, and keeps normal authenticated hard delete unavailable.

## Recurrence Semantics

Supported recurrence rules:

- `FREQ=DAILY;INTERVAL=1`
- `FREQ=WEEKLY;INTERVAL=1`
- `FREQ=MONTHLY;INTERVAL=1`
- Any of the above with `;UNTIL=YYYYMMDDTHHMMSSZ`

The series start is the event's `starts_at`, interpreted in the event's `timezone`. Timed recurring
events preserve local wall time across daylight-saving transitions. All-day recurring events remain
anchored to event-timezone date boundaries.

## Search And Filtering

Search is scoped to active rows visible through the authenticated user's current couple RLS
boundary. The client still includes `couple_id` and `status = 'active'`; RLS remains the
authorization boundary.

Search fields:

- Title.
- Description.
- Location.
- Category label.

Category filters can be combined with search text. Filters affect the visible calendar/agenda and
the search result list without mutating stored events.

## Security

Milestone 7 does not add broad grants, service-role dependencies, or hard-delete capability. New
category and recurrence columns are writable only through the existing authenticated
active-couple-member update and insert policies, with application validation and database
constraints both active.
