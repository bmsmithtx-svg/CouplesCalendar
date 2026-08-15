-- Milestone 5: shared calendar event storage and read security.

create table if not exists public.calendar_events (
  id uuid primary key default extensions.gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_title_length check (length(trim(title)) between 1 and 140),
  constraint calendar_events_description_length check (
    description is null
    or length(description) <= 5000
  ),
  constraint calendar_events_ends_after_start check (ends_at > starts_at)
);

comment on table public.calendar_events is
  'Private shared calendar events owned by an active couple.';
comment on column public.calendar_events.couple_id is
  'Couple workspace that owns the shared event.';
comment on column public.calendar_events.created_by is
  'Profile that created the event. Event mutation is reserved for a later milestone.';
comment on column public.calendar_events.is_all_day is
  'Whether the event should be presented as all-day in the viewer timezone.';

create index if not exists calendar_events_couple_time_idx
  on public.calendar_events (couple_id, starts_at, ends_at);
create index if not exists calendar_events_created_by_idx
  on public.calendar_events (created_by);

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row
execute function public.set_updated_at();

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_select_active_couple_member" on public.calendar_events;
create policy "calendar_events_select_active_couple_member"
on public.calendar_events
for select
to authenticated
using (public.is_active_couple_member(couple_id, (select auth.uid())));

revoke all on public.calendar_events from anon;
revoke all on public.calendar_events from authenticated;
grant select on public.calendar_events to authenticated;
