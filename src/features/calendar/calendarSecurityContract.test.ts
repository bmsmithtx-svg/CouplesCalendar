/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/202608120001_milestone_5_calendar_events.sql',
);

describe('Milestone 5 calendar security contract', () => {
  it('keeps shared calendar reads scoped to active couple membership', () => {
    const migration = readFileSync(migrationPath, { encoding: 'utf8' });

    expect(migration).toContain('create table if not exists public.calendar_events');
    expect(migration).toContain('couple_id uuid not null references public.couples');
    expect(migration).toContain('created_by uuid not null references public.profiles');
    expect(migration).toContain('constraint calendar_events_ends_after_start check');
    expect(migration).toContain('alter table public.calendar_events enable row level security');
    expect(migration).toContain('for select');
    expect(migration).toContain('to authenticated');
    expect(migration).toContain('public.is_active_couple_member(couple_id, (select auth.uid()))');
    expect(migration).toContain('grant select on public.calendar_events to authenticated');
  });

  it('does not grant event mutation before the event-creation milestone', () => {
    const migration = readFileSync(migrationPath, { encoding: 'utf8' });

    expect(migration).not.toMatch(
      /create policy "[^"]+"[\s\S]*?on public\.calendar_events[\s\S]*?for (insert|update|delete|all)/i,
    );
    expect(migration).not.toMatch(
      /grant\s+(insert|update|delete|all)[\s\S]*?on public\.calendar_events to authenticated/i,
    );
  });
});
