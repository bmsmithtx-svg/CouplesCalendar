import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../lib/supabase/database.types';
import type { ProfileInput, ProfileRepository, UserProfile } from './profileTypes';
import { normalizeProfileInput } from './profileValidation';

const profileColumns = 'id, display_name, default_timezone, created_at, updated_at';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

function mapProfile(row: ProfileRow): UserProfile {
  return {
    createdAt: row.created_at,
    defaultTimezone: row.default_timezone,
    displayName: row.display_name,
    id: row.id,
    updatedAt: row.updated_at,
  };
}

export function createSupabaseProfileRepository(
  client: SupabaseClient<Database>,
): ProfileRepository {
  return {
    async getOwnProfile(userId: string) {
      const { data, error } = await client
        .from('profiles')
        .select(profileColumns)
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapProfile(data) : null;
    },

    async saveOwnProfile(userId: string, input: ProfileInput) {
      const values = normalizeProfileInput(input);
      const { data, error } = await client
        .from('profiles')
        .upsert(
          {
            default_timezone: values.defaultTimezone,
            display_name: values.displayName,
            id: userId,
          },
          { onConflict: 'id' },
        )
        .select(profileColumns)
        .single();

      if (error) {
        throw error;
      }

      return mapProfile(data);
    },
  };
}
