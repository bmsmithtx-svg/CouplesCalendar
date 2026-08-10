import type { ProfileInput, ProfileRepository, UserProfile } from './profileTypes';
import { normalizeProfileInput } from './profileValidation';

const profileColumns = 'id, display_name, default_timezone, created_at, updated_at';

type SupabaseError = {
  message: string;
};

type ProfileRow = {
  created_at: string;
  default_timezone: string;
  display_name: string;
  id: string;
  updated_at: string;
};

type ProfileQueryBuilder = {
  eq: (column: string, value: string) => ProfileQueryBuilder;
  maybeSingle: () => Promise<{ data: ProfileRow | null; error: SupabaseError | null }>;
  select: (columns: string) => ProfileQueryBuilder;
  single: () => Promise<{ data: ProfileRow; error: SupabaseError | null }>;
  upsert: (
    values: {
      default_timezone: string;
      display_name: string;
      id: string;
    },
    options: { onConflict: string },
  ) => ProfileQueryBuilder;
};

type SupabaseProfilesLike = {
  from: (table: 'profiles') => ProfileQueryBuilder;
};

function mapProfile(row: ProfileRow): UserProfile {
  return {
    createdAt: row.created_at,
    defaultTimezone: row.default_timezone,
    displayName: row.display_name,
    id: row.id,
    updatedAt: row.updated_at,
  };
}

function throwSupabaseError(error: SupabaseError): never {
  throw new Error(error.message);
}

export function createSupabaseProfileRepository(client: unknown): ProfileRepository {
  const supabase = client as SupabaseProfilesLike;

  return {
    async getOwnProfile(userId: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select(profileColumns)
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throwSupabaseError(error);
      }

      return data ? mapProfile(data) : null;
    },

    async saveOwnProfile(userId: string, input: ProfileInput) {
      const values = normalizeProfileInput(input);
      const { data, error } = await supabase
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
        throwSupabaseError(error);
      }

      return mapProfile(data);
    },
  };
}
