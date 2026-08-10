-- Milestone 4: couple creation, invitation lifecycle, and membership security.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.couples (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id),
  status text not null default 'active',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint couples_name_length check (length(trim(name)) between 1 and 80),
  constraint couples_status_valid check (status in ('active', 'deleted')),
  constraint couples_deleted_at_matches_status check (
    (status = 'active' and deleted_at is null)
    or (status = 'deleted' and deleted_at is not null)
  )
);

create table if not exists public.couple_members (
  id uuid primary key default extensions.gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  membership_status text not null default 'active',
  active_member_slot smallint,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint couple_members_unique_user_per_couple unique (couple_id, user_id),
  constraint couple_members_role_member check (role = 'member'),
  constraint couple_members_status_valid check (
    membership_status in ('active', 'exited', 'removed')
  ),
  constraint couple_members_active_fields check (
    (
      membership_status = 'active'
      and active_member_slot in (1, 2)
      and left_at is null
    )
    or (
      membership_status <> 'active'
      and active_member_slot is null
      and left_at is not null
    )
  )
);

create table if not exists public.couple_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  token_hash text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  accepted_by uuid references public.profiles (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint couple_invitations_token_hash_unique unique (token_hash),
  constraint couple_invitations_status_valid check (status in ('pending', 'accepted', 'revoked')),
  constraint couple_invitations_expiry_after_creation check (expires_at > created_at),
  constraint couple_invitations_status_fields check (
    (
      status = 'pending'
      and revoked_at is null
      and accepted_by is null
      and accepted_at is null
    )
    or (
      status = 'accepted'
      and revoked_at is null
      and accepted_by is not null
      and accepted_at is not null
    )
    or (
      status = 'revoked'
      and revoked_at is not null
      and accepted_by is null
      and accepted_at is null
    )
  )
);

comment on table public.couples is
  'Private two-person workspace created by an authenticated profile.';
comment on table public.couple_members is
  'Membership slots that enforce one active couple per user and at most two active members per couple.';
comment on table public.couple_invitations is
  'One-time bearer invitations; only token hashes are stored.';
comment on column public.couple_invitations.token_hash is
  'SHA-256 hash of the invitation token. Plaintext invitation tokens are never stored.';

create index if not exists couples_status_idx on public.couples (status);
create index if not exists couple_members_couple_status_idx
  on public.couple_members (couple_id, membership_status);
create index if not exists couple_members_user_status_idx
  on public.couple_members (user_id, membership_status);
create unique index if not exists couple_members_one_active_couple_per_user
  on public.couple_members (user_id)
  where membership_status = 'active';
create unique index if not exists couple_members_active_slot_unique
  on public.couple_members (couple_id, active_member_slot)
  where membership_status = 'active';
create unique index if not exists couple_invitations_one_pending_per_couple
  on public.couple_invitations (couple_id)
  where status = 'pending';
create index if not exists couple_invitations_pending_expiry_idx
  on public.couple_invitations (expires_at)
  where status = 'pending';

drop trigger if exists couples_set_updated_at on public.couples;
create trigger couples_set_updated_at
before update on public.couples
for each row
execute function public.set_updated_at();

drop trigger if exists couple_members_set_updated_at on public.couple_members;
create trigger couple_members_set_updated_at
before update on public.couple_members
for each row
execute function public.set_updated_at();

drop trigger if exists couple_invitations_set_updated_at on public.couple_invitations;
create trigger couple_invitations_set_updated_at
before update on public.couple_invitations
for each row
execute function public.set_updated_at();

create or replace function public.enforce_couple_member_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform 1
  from public.couples
  where id = new.couple_id
  for update;

  if (
    select count(*)
    from public.couple_members
    where couple_id = new.couple_id
  ) >= 2 then
    raise exception 'couple_member_limit_reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists couple_members_enforce_member_limit on public.couple_members;
create trigger couple_members_enforce_member_limit
before insert on public.couple_members
for each row
execute function public.enforce_couple_member_limit();

create or replace function public.hash_couple_invitation_token(invitation_token text)
returns text
language sql
immutable
strict
set search_path = public, pg_temp
as $$
  select encode(extensions.digest(invitation_token, 'sha256'), 'hex');
$$;

create or replace function public.generate_couple_invitation_token()
returns text
language sql
volatile
set search_path = public, pg_temp
as $$
  select translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');
$$;

create or replace function public.is_active_couple_member(
  target_couple_id uuid,
  target_user_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.couple_members member
    join public.couples couple on couple.id = member.couple_id
    where member.couple_id = target_couple_id
      and member.user_id = target_user_id
      and target_user_id = (select auth.uid())
      and member.membership_status = 'active'
      and couple.status = 'active'
  );
$$;

create or replace function public.can_select_profile(
  target_user_id uuid,
  current_user_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select target_user_id = current_user_id
    or exists (
      select 1
      from public.couple_members current_member
      join public.couple_members target_member
        on target_member.couple_id = current_member.couple_id
      join public.couples couple on couple.id = current_member.couple_id
      where current_member.user_id = current_user_id
        and current_member.membership_status = 'active'
        and target_member.user_id = target_user_id
        and target_member.membership_status = 'active'
        and couple.status = 'active'
    );
$$;

create or replace function public.create_couple(couple_name text)
returns table (couple_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_name text := trim(couple_name);
  new_couple_id uuid;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if length(normalized_name) not between 1 and 80 then
    raise exception 'invalid_couple_name' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.profiles where id = current_user_id) then
    raise exception 'profile_required' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.couple_members member
    join public.couples couple on couple.id = member.couple_id
    where member.user_id = current_user_id
      and member.membership_status = 'active'
      and couple.status = 'active'
  ) then
    raise exception 'already_coupled' using errcode = 'P0001';
  end if;

  insert into public.couples (name, created_by)
  values (normalized_name, current_user_id)
  returning id into new_couple_id;

  insert into public.couple_members (couple_id, user_id, active_member_slot)
  values (new_couple_id, current_user_id, 1);

  return query select new_couple_id;
exception
  when unique_violation then
    raise exception 'already_coupled' using errcode = 'P0001';
end;
$$;

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
  from public.couple_members member
  join public.couples couple on couple.id = member.couple_id
  where member.user_id = current_user_id
    and member.membership_status = 'active'
    and couple.status = 'active'
  for update of couple;

  if active_couple_id is null then
    raise exception 'no_active_couple' using errcode = 'P0001';
  end if;

  select
    count(*) filter (where membership_status = 'active'),
    count(*)
  into active_count, total_count
  from public.couple_members
  where couple_id = active_couple_id;

  if active_count >= 2 then
    raise exception 'couple_full' using errcode = 'P0001';
  end if;

  if active_count <> 1 or total_count <> 1 then
    raise exception 'invitation_unavailable' using errcode = 'P0001';
  end if;

  update public.couple_invitations
  set status = 'revoked',
      revoked_at = now()
  where couple_id = active_couple_id
    and status = 'pending';

  generated_token := public.generate_couple_invitation_token();
  generated_hash := public.hash_couple_invitation_token(generated_token);

  insert into public.couple_invitations (couple_id, created_by, token_hash, expires_at)
  values (active_couple_id, current_user_id, generated_hash, now() + interval '7 days')
  returning id, expires_at, created_at
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

  select *
  into invitation_record
  from public.couple_invitations
  where token_hash = public.hash_couple_invitation_token(invitation_token);

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
    from public.couples
    where id = invitation_record.couple_id
      and status = 'active'
  ) then
    return query select 'invalid'::text, invitation_record.expires_at;
    return;
  end if;

  select
    count(*) filter (where membership_status = 'active'),
    count(*)
  into active_count, total_count
  from public.couple_members
  where couple_id = invitation_record.couple_id;

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

  if not exists (select 1 from public.profiles where id = current_user_id) then
    return query select 'profile_required'::text, null::uuid, null::uuid;
    return;
  end if;

  if exists (
    select 1
    from public.couple_members member
    join public.couples couple on couple.id = member.couple_id
    where member.user_id = current_user_id
      and member.membership_status = 'active'
      and couple.status = 'active'
  ) then
    return query select 'already_coupled'::text, null::uuid, null::uuid;
    return;
  end if;

  select *
  into invitation_record
  from public.couple_invitations
  where token_hash = public.hash_couple_invitation_token(invitation_token);

  if invitation_record.id is null then
    return query select 'invalid'::text, null::uuid, null::uuid;
    return;
  end if;

  perform 1
  from public.couples
  where id = invitation_record.couple_id
    and status = 'active'
  for update;

  if not found then
    return query select 'invalid'::text, null::uuid, null::uuid;
    return;
  end if;

  select *
  into invitation_record
  from public.couple_invitations
  where id = invitation_record.id
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
    count(*) filter (where membership_status = 'active'),
    count(*)
  into active_count, total_count
  from public.couple_members
  where couple_id = invitation_record.couple_id;

  if active_count >= 2 or total_count >= 2 then
    return query select 'couple_full'::text, null::uuid, invitation_record.id;
    return;
  end if;

  selected_slot := case
    when exists (
      select 1
      from public.couple_members
      where couple_id = invitation_record.couple_id
        and membership_status = 'active'
        and active_member_slot = 1
    ) then 2
    else 1
  end;

  insert into public.couple_members (couple_id, user_id, active_member_slot)
  values (invitation_record.couple_id, current_user_id, selected_slot);

  update public.couple_invitations
  set status = 'accepted',
      accepted_by = current_user_id,
      accepted_at = now()
  where id = invitation_record.id;

  return query select 'accepted'::text, invitation_record.couple_id, invitation_record.id;
exception
  when unique_violation then
    return query select 'couple_full'::text, null::uuid, invitation_record.id;
end;
$$;

create or replace function public.revoke_couple_invitation(invitation_id uuid)
returns table (status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  invitation_record public.couple_invitations%rowtype;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select *
  into invitation_record
  from public.couple_invitations
  where id = invitation_id;

  if invitation_record.id is null then
    return query select 'invalid'::text;
    return;
  end if;

  perform 1
  from public.couples
  where id = invitation_record.couple_id
  for update;

  select *
  into invitation_record
  from public.couple_invitations
  where id = invitation_id
  for update;

  if not public.is_active_couple_member(invitation_record.couple_id, current_user_id) then
    raise exception 'permission_denied' using errcode = 'P0001';
  end if;

  if invitation_record.status <> 'pending' then
    return query select 'unavailable'::text;
    return;
  end if;

  update public.couple_invitations
  set status = 'revoked',
      revoked_at = now()
  where id = invitation_record.id;

  return query select 'revoked'::text;
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
  from public.couples
  where id = target_couple_id
    and status = 'active'
  for update;

  if not found then
    return query select 'invalid'::text;
    return;
  end if;

  if not public.is_active_couple_member(target_couple_id, current_user_id) then
    raise exception 'permission_denied' using errcode = 'P0001';
  end if;

  update public.couple_members
  set membership_status = 'exited',
      active_member_slot = null,
      left_at = now()
  where couple_id = target_couple_id
    and user_id = current_user_id
    and membership_status = 'active';

  update public.couple_invitations
  set status = 'revoked',
      revoked_at = now()
  where couple_id = target_couple_id
    and status = 'pending';

  select count(*)
  into remaining_active_count
  from public.couple_members
  where couple_id = target_couple_id
    and membership_status = 'active';

  if remaining_active_count = 0 then
    update public.couples
    set status = 'deleted',
        deleted_at = now()
    where id = target_couple_id;
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
  from public.couples
  where id = target_couple_id
    and status = 'active'
  for update;

  if not found then
    return query select 'invalid'::text;
    return;
  end if;

  if not public.is_active_couple_member(target_couple_id, current_user_id) then
    raise exception 'permission_denied' using errcode = 'P0001';
  end if;

  update public.couple_invitations
  set status = 'revoked',
      revoked_at = now()
  where couple_id = target_couple_id
    and status = 'pending';

  update public.couple_members
  set membership_status = 'removed',
      active_member_slot = null,
      left_at = now()
  where couple_id = target_couple_id
    and membership_status = 'active';

  update public.couples
  set status = 'deleted',
      deleted_at = now()
  where id = target_couple_id;

  return query select 'deleted'::text;
end;
$$;

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.couple_invitations enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_own_or_active_partner" on public.profiles;
create policy "profiles_select_own_or_active_partner"
on public.profiles
for select
to authenticated
using (public.can_select_profile(id, (select auth.uid())));

drop policy if exists "couples_select_active_member" on public.couples;
create policy "couples_select_active_member"
on public.couples
for select
to authenticated
using (
  status = 'active'
  and public.is_active_couple_member(id, (select auth.uid()))
);

drop policy if exists "couple_members_select_authorized" on public.couple_members;
create policy "couple_members_select_authorized"
on public.couple_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_active_couple_member(couple_id, (select auth.uid()))
);

drop policy if exists "couple_invitations_select_active_member" on public.couple_invitations;
create policy "couple_invitations_select_active_member"
on public.couple_invitations
for select
to authenticated
using (public.is_active_couple_member(couple_id, (select auth.uid())));

grant select on public.couples to authenticated;
grant select on public.couple_members to authenticated;
revoke all on public.couple_invitations from authenticated;
grant select (
  id,
  couple_id,
  created_by,
  status,
  expires_at,
  revoked_at,
  accepted_by,
  accepted_at,
  created_at,
  updated_at
) on public.couple_invitations to authenticated;

revoke all on function public.enforce_couple_member_limit() from public;
revoke all on function public.hash_couple_invitation_token(text) from public;
revoke all on function public.generate_couple_invitation_token() from public;
revoke all on function public.is_active_couple_member(uuid, uuid) from public;
revoke all on function public.can_select_profile(uuid, uuid) from public;
revoke all on function public.create_couple(text) from public;
revoke all on function public.create_couple_invitation() from public;
revoke all on function public.inspect_couple_invitation(text) from public;
revoke all on function public.accept_couple_invitation(text) from public;
revoke all on function public.revoke_couple_invitation(uuid) from public;
revoke all on function public.leave_couple(uuid) from public;
revoke all on function public.delete_couple(uuid) from public;

grant execute on function public.is_active_couple_member(uuid, uuid) to authenticated;
grant execute on function public.can_select_profile(uuid, uuid) to authenticated;
grant execute on function public.create_couple(text) to authenticated;
grant execute on function public.create_couple_invitation() to authenticated;
grant execute on function public.inspect_couple_invitation(text) to authenticated;
grant execute on function public.accept_couple_invitation(text) to authenticated;
grant execute on function public.revoke_couple_invitation(uuid) to authenticated;
grant execute on function public.leave_couple(uuid) to authenticated;
grant execute on function public.delete_couple(uuid) to authenticated;
