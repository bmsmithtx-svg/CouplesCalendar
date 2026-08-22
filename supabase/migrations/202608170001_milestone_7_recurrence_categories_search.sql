-- Milestone 7: recurring series metadata, fixed event categories, and search/filter support.

alter table public.calendar_events
  add column if not exists category text,
  add column if not exists recurrence_rule text,
  add column if not exists recurrence_ends_at timestamptz;

update public.calendar_events
set category = 'personal'
where category is null;

alter table public.calendar_events
  alter column category set default 'personal',
  alter column category set not null;

alter table public.calendar_events
  drop constraint if exists calendar_events_category_valid,
  drop constraint if exists calendar_events_recurrence_rule_length,
  drop constraint if exists calendar_events_recurrence_rule_supported,
  drop constraint if exists calendar_events_recurrence_end_after_start,
  drop constraint if exists calendar_events_recurrence_end_requires_rule;

alter table public.calendar_events
  add constraint calendar_events_category_valid check (
    category in (
      'personal',
      'work',
      'date',
      'appointment',
      'travel',
      'family',
      'other'
    )
  ),
  add constraint calendar_events_recurrence_rule_length check (
    recurrence_rule is null
    or length(recurrence_rule) <= 160
  ),
  add constraint calendar_events_recurrence_rule_supported check (
    recurrence_rule is null
    or recurrence_rule ~ '^FREQ=(DAILY|WEEKLY|MONTHLY);INTERVAL=1(;UNTIL=[0-9]{8}T[0-9]{6}Z)?$'
  ),
  add constraint calendar_events_recurrence_end_after_start check (
    recurrence_ends_at is null
    or recurrence_ends_at >= starts_at
  ),
  add constraint calendar_events_recurrence_end_requires_rule check (
    recurrence_rule is not null
    or recurrence_ends_at is null
  );

comment on column public.calendar_events.category is
  'Milestone 7 fixed event category used for display, filtering, and search.';
comment on column public.calendar_events.recurrence_rule is
  'Supported RFC 5545 RRULE subset without DTSTART: daily, weekly, or monthly with interval 1 and optional UTC UNTIL.';
comment on column public.calendar_events.recurrence_ends_at is
  'Optional UTC helper for the recurrence end date; open-ended series leave this null.';

create index if not exists calendar_events_couple_status_category_idx
  on public.calendar_events (couple_id, status, category);

create index if not exists calendar_events_couple_status_recurrence_idx
  on public.calendar_events (couple_id, status, recurrence_ends_at)
  where recurrence_rule is not null;

create index if not exists calendar_events_couple_status_title_search_idx
  on public.calendar_events (couple_id, status, lower(title));

grant insert (
  category,
  recurrence_rule,
  recurrence_ends_at
) on public.calendar_events to authenticated;

grant update (
  category,
  recurrence_rule,
  recurrence_ends_at
) on public.calendar_events to authenticated;
