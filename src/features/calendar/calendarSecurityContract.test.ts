/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/202608160001_milestone_6_event_crud.sql',
);
const updatePolicyRepairMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/202608160002_fix_calendar_event_update_policy.sql',
);
const softDeleteVisibilityMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/202608160003_allow_calendar_event_soft_delete_visibility.sql',
);

function readMilestone6Migrations() {
  return `${readFileSync(migrationPath, { encoding: 'utf8' })}\n${readFileSync(
    updatePolicyRepairMigrationPath,
    {
      encoding: 'utf8',
    },
  )}\n${readFileSync(softDeleteVisibilityMigrationPath, { encoding: 'utf8' })}`;
}

describe('Milestone 6 calendar security contract', () => {
  it('keeps shared calendar reads scoped to active couple membership and active events', () => {
    const migration = readFileSync(migrationPath, { encoding: 'utf8' });

    expect(migration).toContain('for select');
    expect(migration).toContain('to authenticated');
    expect(migration).toContain("status = 'active'");
    expect(migration).toContain('public.is_active_couple_member(couple_id, (select auth.uid()))');
    expect(migration).toContain('grant select on public.calendar_events to authenticated');
  });

  it('allows inserts only for authenticated active members creating rows as themselves', () => {
    const migration = readFileSync(migrationPath, { encoding: 'utf8' });

    expect(migration).toContain('for insert');
    expect(migration).toContain('created_by = (select auth.uid())');
    expect(migration).toContain('public.is_active_couple_member(couple_id, (select auth.uid()))');
    expect(migration).toContain(
      'grant insert (\n  couple_id,\n  created_by,\n  title,\n  description,\n  location,\n  starts_at,\n  ends_at,\n  is_all_day,\n  timezone\n) on public.calendar_events to authenticated',
    );
  });

  it('allows active-member updates without granting hard delete', () => {
    const migration = readMilestone6Migrations();
    const updatePolicyRepairMigration = readFileSync(updatePolicyRepairMigrationPath, {
      encoding: 'utf8',
    });

    expect(migration).toContain('for update');
    expect(migration).toContain("old.status = 'deleted'");
    expect(migration).toContain("status = 'deleted'");
    expect(updatePolicyRepairMigration).toContain(
      'with check (\n  public.is_active_couple_member(couple_id, (select auth.uid()))\n)',
    );
    expect(updatePolicyRepairMigration).not.toContain('updated_by is null');
    expect(updatePolicyRepairMigration).not.toContain('updated_by = (select auth.uid())');
    expect(migration).toContain('create policy "calendar_events_select_deleted_couple_member"');
    expect(migration).toContain("status = 'deleted'");
    expect(migration).toContain('grant update (');
    expect(migration).not.toMatch(/grant\s+delete\s+on public\.calendar_events to authenticated/i);
    expect(migration).not.toMatch(
      /create policy "[^"]+"[\s\S]*?on public\.calendar_events[\s\S]*?for delete/i,
    );
  });
});
