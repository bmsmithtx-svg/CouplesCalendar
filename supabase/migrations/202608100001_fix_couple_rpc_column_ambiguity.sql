-- Fix Milestone 4 RPCs that returned table columns with names also used in SQL bodies.
-- PL/pgSQL treats output columns as variables, so table columns must be qualified.

create or replace function public.create_couple_invitation()
returns table (
  invitation_id uuid,
  couple_id uuid,
  invitation_token text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  active_count integer;
  active_couple_id uuid;
  current_user_id uuid := (select auth.uid());
  generated_hash text;
  generated_token text;
  inserted_created_at timestamptz;
  inserted_expires_at timestamptz;
  inserted_id uuid;
  total_count integer;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select couple.id
  into active_couple_id
  from public.couple_members as member
  join public.couples as couple on couple.id = member.couple_id
  where member.user_id = current_user_id
    and member.membership_status = 'active'
    and couple.status = 'active'
  for update of couple;

  if active_couple_id is null then
    raise exception 'no_active_couple' using errcode = 'P0001';
  end if;

  select
    count(*) filter (where member.membership_status = 'active'),
    count(*)
  into active_count, total_count
  from public.couple_members as member
  where member.couple_id = active_couple_id;

  if active_count >= 2 then
    raise exception 'couple_full' using errcode = 'P0001';
  end if;

  if active_count <> 1 or total_count <> 1 then
    raise exception 'invitation_unavailable' using errcode = 'P0001';
  end if;

  update public.couple_invitations as invitation
  set status = 'revoked',
      revoked_at = now()
  where invitation.couple_id = active_couple_id
    and invitation.status = 'pending';

  generated_token := public.generate_couple_invitation_token();
  generated_hash := public.hash_couple_invitation_token(generated_token);

  insert into public.couple_invitations as invitation (
    couple_id,
    created_by,
    token_hash,
    expires_at
  )
  values (active_couple_id, current_user_id, generated_hash, now() + interval '7 days')
  returning invitation.id, invitation.expires_at, invitation.created_at
  into inserted_id, inserted_expires_at, inserted_created_at;

  return query select
    inserted_id,
    active_couple_id,
    generated_token,
    inserted_expires_at,
    inserted_created_at;
end;
$$;

create or replace function public.inspect_couple_invitation(invitation_token text)
returns table (status text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  active_count integer;
  invitation_record public.couple_invitations%rowtype;
  total_count integer;
begin
  if invitation_token is null or length(trim(invitation_token)) = 0 then
    return query select 'invalid'::text, null::timestamptz;
    return;
  end if;

  select invitation.*
  into invitation_record
  from public.couple_invitations as invitation
  where invitation.token_hash = public.hash_couple_invitation_token(invitation_token);

  if invitation_record.id is null then
    return query select 'invalid'::text, null::timestamptz;
    return;
  end if;

  if invitation_record.status = 'revoked' then
    return query select 'revoked'::text, invitation_record.expires_at;
    return;
  end if;

  if invitation_record.status = 'accepted' then
    return query select 'already_used'::text, invitation_record.expires_at;
    return;
  end if;

  if invitation_record.expires_at <= now() then
    return query select 'expired'::text, invitation_record.expires_at;
    return;
  end if;

  if not exists (
    select 1
    from public.couples as couple
    where couple.id = invitation_record.couple_id
      and couple.status = 'active'
  ) then
    return query select 'invalid'::text, invitation_record.expires_at;
    return;
  end if;

  select
    count(*) filter (where member.membership_status = 'active'),
    count(*)
  into active_count, total_count
  from public.couple_members as member
  where member.couple_id = invitation_record.couple_id;

  if active_count >= 2 or total_count >= 2 then
    return query select 'couple_full'::text, invitation_record.expires_at;
    return;
  end if;

  return query select 'pending'::text, invitation_record.expires_at;
end;
$$;

create or replace function public.accept_couple_invitation(invitation_token text)
returns table (status text, couple_id uuid, invitation_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  active_count integer;
  current_user_id uuid := (select auth.uid());
  invitation_record public.couple_invitations%rowtype;
  selected_slot smallint;
  total_count integer;
begin
  if current_user_id is null then
    return query select 'not_authenticated'::text, null::uuid, null::uuid;
    return;
  end if;

  if invitation_token is null or length(trim(invitation_token)) = 0 then
    return query select 'invalid'::text, null::uuid, null::uuid;
    return;
  end if;

  if not exists (select 1 from public.profiles as profile where profile.id = current_user_id) then
    return query select 'profile_required'::text, null::uuid, null::uuid;
    return;
  end if;

  if exists (
    select 1
    from public.couple_members as member
    join public.couples as couple on couple.id = member.couple_id
    where member.user_id = current_user_id
      and member.membership_status = 'active'
      and couple.status = 'active'
  ) then
    return query select 'already_coupled'::text, null::uuid, null::uuid;
    return;
  end if;

  select invitation.*
  into invitation_record
  from public.couple_invitations as invitation
  where invitation.token_hash = public.hash_couple_invitation_token(invitation_token);

  if invitation_record.id is null then
    return query select 'invalid'::text, null::uuid, null::uuid;
    return;
  end if;

  perform 1
  from public.couples as couple
  where couple.id = invitation_record.couple_id
    and couple.status = 'active'
  for update;

  if not found then
    return query select 'invalid'::text, null::uuid, null::uuid;
    return;
  end if;

  select invitation.*
  into invitation_record
  from public.couple_invitations as invitation
  where invitation.id = invitation_record.id
  for update;

  if invitation_record.status = 'revoked' then
    return query select 'revoked'::text, null::uuid, invitation_record.id;
    return;
  end if;

  if invitation_record.status = 'accepted' then
    return query select 'already_used'::text, null::uuid, invitation_record.id;
    return;
  end if;

  if invitation_record.expires_at <= now() then
    return query select 'expired'::text, null::uuid, invitation_record.id;
    return;
  end if;

  select
    count(*) filter (where member.membership_status = 'active'),
    count(*)
  into active_count, total_count
  from public.couple_members as member
  where member.couple_id = invitation_record.couple_id;

  if active_count >= 2 or total_count >= 2 then
    return query select 'couple_full'::text, null::uuid, invitation_record.id;
    return;
  end if;

  selected_slot := case
    when exists (
      select 1
      from public.couple_members as member
      where member.couple_id = invitation_record.couple_id
        and member.membership_status = 'active'
        and member.active_member_slot = 1
    ) then 2
    else 1
  end;

  insert into public.couple_members (couple_id, user_id, active_member_slot)
  values (invitation_record.couple_id, current_user_id, selected_slot);

  update public.couple_invitations as invitation
  set status = 'accepted',
      accepted_by = current_user_id,
      accepted_at = now()
  where invitation.id = invitation_record.id;

  return query select 'accepted'::text, invitation_record.couple_id, invitation_record.id;
exception
  when unique_violation then
    return query select 'couple_full'::text, null::uuid, invitation_record.id;
end;
$$;

create or replace function public.leave_couple(target_couple_id uuid)
returns table (status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  remaining_active_count integer;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  perform 1
  from public.couples as couple
  where couple.id = target_couple_id
    and couple.status = 'active'
  for update;

  if not found then
    return query select 'invalid'::text;
    return;
  end if;

  if not public.is_active_couple_member(target_couple_id, current_user_id) then
    raise exception 'permission_denied' using errcode = 'P0001';
  end if;

  update public.couple_members as member
  set membership_status = 'exited',
      active_member_slot = null,
      left_at = now()
  where member.couple_id = target_couple_id
    and member.user_id = current_user_id
    and member.membership_status = 'active';

  update public.couple_invitations as invitation
  set status = 'revoked',
      revoked_at = now()
  where invitation.couple_id = target_couple_id
    and invitation.status = 'pending';

  select count(*)
  into remaining_active_count
  from public.couple_members as member
  where member.couple_id = target_couple_id
    and member.membership_status = 'active';

  if remaining_active_count = 0 then
    update public.couples as couple
    set status = 'deleted',
        deleted_at = now()
    where couple.id = target_couple_id;
  end if;

  return query select 'left'::text;
end;
$$;

create or replace function public.delete_couple(target_couple_id uuid)
returns table (status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  perform 1
  from public.couples as couple
  where couple.id = target_couple_id
    and couple.status = 'active'
  for update;

  if not found then
    return query select 'invalid'::text;
    return;
  end if;

  if not public.is_active_couple_member(target_couple_id, current_user_id) then
    raise exception 'permission_denied' using errcode = 'P0001';
  end if;

  update public.couple_invitations as invitation
  set status = 'revoked',
      revoked_at = now()
  where invitation.couple_id = target_couple_id
    and invitation.status = 'pending';

  update public.couple_members as member
  set membership_status = 'removed',
      active_member_slot = null,
      left_at = now()
  where member.couple_id = target_couple_id
    and member.membership_status = 'active';

  update public.couples as couple
  set status = 'deleted',
      deleted_at = now()
  where couple.id = target_couple_id;

  return query select 'deleted'::text;
end;
$$;
