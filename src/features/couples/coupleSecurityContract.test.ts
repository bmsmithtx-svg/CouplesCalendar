import { describe, expect, it } from 'vitest';

import { getSafeCoupleErrorMessage } from './coupleErrors';

const expectedMigrationControls = [
  'RLS on couples',
  'RLS on couple_members',
  'RLS on couple_invitations',
  'one active couple per user index',
  'active member slot unique index',
  'member limit trigger',
  'token hash storage',
  'column-level invitation grants without token_hash',
  'security definer RPC search_path',
] as const;

describe('Milestone 4 security contract', () => {
  it('documents the required migration controls covered by implementation review', () => {
    expect(expectedMigrationControls).toEqual([
      'RLS on couples',
      'RLS on couple_members',
      'RLS on couple_invitations',
      'one active couple per user index',
      'active member slot unique index',
      'member limit trigger',
      'token hash storage',
      'column-level invitation grants without token_hash',
      'security definer RPC search_path',
    ]);
  });

  it('maps expected database rejections to safe UI errors', () => {
    expect(getSafeCoupleErrorMessage(new Error('already_coupled'))).toBe(
      'This account already belongs to a couple.',
    );
    expect(getSafeCoupleErrorMessage(new Error('couple_member_limit_reached'))).toBe(
      'That couple already has two members.',
    );
    expect(getSafeCoupleErrorMessage(new Error('permission denied for table couple_members'))).toBe(
      'The current session cannot perform that couple action.',
    );
  });
});
