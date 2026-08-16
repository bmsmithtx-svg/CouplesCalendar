-- Milestone 6 repair: allow the UPDATE ... status = 'deleted' transition
-- to pass RLS by permitting active couple members to see the resulting
-- soft-deleted row. Standard calendar reads still filter status = 'active'.

drop policy if exists "calendar_events_select_deleted_couple_member" on public.calendar_events;
create policy "calendar_events_select_deleted_couple_member"
on public.calendar_events
for select
to authenticated
using (
  status = 'deleted'
  and public.is_active_couple_member(couple_id, (select auth.uid()))
);
