-- Milestone 6 repair: either active couple member may update or soft-delete
-- an active event, even when the other member performed the previous edit.

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
);
