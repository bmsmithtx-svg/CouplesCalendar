-- Milestone 6: event creation, editing, details, and soft deletion.

alter table public.calendar_events
  add column if not exists location text,
  add column if not exists timezone text,
  add column if not exists updated_by uuid references public.profiles (id),
  add column if not exists status text default 'active',
  add column if not exists deleted_at timestamptz,
  add column if not exists version integer not null default 1;

update public.calendar_events
set timezone = 'UTC'
where timezone is null;

update public.calendar_events
set status = 'active'
where status is null;

alter table public.calendar_events
  alter column timezone set default 'UTC',
  alter column timezone set not null,
  alter column status set default 'active',
  alter column status set not null;

alter table public.calendar_events
  drop constraint if exists calendar_events_location_length,
  drop constraint if exists calendar_events_timezone_present,
  drop constraint if exists calendar_events_status_valid,
  drop constraint if exists calendar_events_deleted_at_matches_status,
  drop constraint if exists calendar_events_version_positive;

alter table public.calendar_events
  add constraint calendar_events_location_length check (
    location is null
    or length(location) <= 500
  ),
  add constraint calendar_events_timezone_present check (length(trim(timezone)) > 0),
  add constraint calendar_events_status_valid check (status in ('active', 'deleted')),
  add constraint calendar_events_deleted_at_matches_status check (
    (status = 'active' and deleted_at is null)
    or (status = 'deleted' and deleted_at is not null)
  ),
  add constraint calendar_events_version_positive check (version > 0);

comment on column public.calendar_events.location is
  'Optional Milestone 6 event location.';
comment on column public.calendar_events.timezone is
  'IANA timezone used to interpret timed wall-clock values and all-day date boundaries.';
comment on column public.calendar_events.updated_by is
  'Most recent authenticated profile to mutate the event.';
comment on column public.calendar_events.status is
  'Active events are visible. Deleted events are soft-deleted and hidden from normal reads.';
comment on column public.calendar_events.version is
  'Optimistic concurrency counter incremented by database trigger on mutation.';

create index if not exists calendar_events_couple_status_time_idx
  on public.calendar_events (couple_id, status, starts_at, ends_at);
create index if not exists calendar_events_couple_status_updated_idx
  on public.calendar_events (couple_id, status, updated_at);

create or replace function public.prepare_calendar_event_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if new.id <> old.id
    or new.couple_id <> old.couple_id
    or new.created_by <> old.created_by
    or new.created_at <> old.created_at then
    raise exception 'calendar_event_immutable_field' using errcode = 'P0001';
  end if;

  if old.status = 'deleted' then
    raise exception 'calendar_event_deleted' using errcode = 'P0001';
  end if;

  if new.status = 'deleted' and new.deleted_at is null then
    new.deleted_at = now();
  end if;

  if new.status = 'active' then
    new.deleted_at = null;
  end if;

  if current_user_id is not null then
    new.updated_by = current_user_id;
  end if;

  new.version = old.version + 1;
  new.updated_at = now();

  return new;
end;
$$;

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row
execute function public.prepare_calendar_event_update();

drop policy if exists "calendar_events_select_active_couple_member" on public.calendar_events;
create policy "calendar_events_select_active_couple_member"
on public.calendar_events
for select
to authenticated
using (
  status = 'active'
  and public.is_active_couple_member(couple_id, (select auth.uid()))
);

drop policy if exists "calendar_events_insert_active_couple_member" on public.calendar_events;
create policy "calendar_events_insert_active_couple_member"
on public.calendar_events
for insert
to authenticated
with check (
  status = 'active'
  and deleted_at is null
  and created_by = (select auth.uid())
  and public.is_active_couple_member(couple_id, (select auth.uid()))
);

drop policy if exists "calendar_events_update_active_couple_member" on public.calendar_events;
create policy "calendar_events_update_active_couple_member"
on public.calendar_events
for update
to authenticated
using (
  status = 'active'
  and public.is_active_couple_member(couple_id, (select auth.uid()))
)
with check (
  public.is_active_couple_member(couple_id, (select auth.uid()))
  and (
    updated_by is null
    or updated_by = (select auth.uid())
  )
);

revoke all on public.calendar_events from anon;
revoke all on public.calendar_events from authenticated;
grant select on public.calendar_events to authenticated;
grant insert (
  couple_id,
  created_by,
  title,
  description,
  location,
  starts_at,
  ends_at,
  is_all_day,
  timezone
) on public.calendar_events to authenticated;
grant update (
  title,
  description,
  location,
  starts_at,
  ends_at,
  is_all_day,
  timezone,
  updated_by,
  status,
  deleted_at
) on public.calendar_events to authenticated;
