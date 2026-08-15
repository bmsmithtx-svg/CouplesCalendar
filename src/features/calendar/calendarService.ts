import type { CalendarEvent, CalendarRepository } from './calendarTypes';

type CalendarEventRow = {
  couple_id: string;
  created_at: string;
  created_by: string;
  description: string | null;
  ends_at: string;
  id: string;
  is_all_day: boolean;
  starts_at: string;
  title: string;
  updated_at: string;
};

type ProfileNameRow = {
  display_name: string;
  id: string;
};

type QueryError = {
  message: string;
};

type QueryResponse<T> = {
  data: T;
  error: QueryError | null;
};

type QueryBuilder = PromiseLike<QueryResponse<unknown>> & {
  eq: (column: string, value: string) => QueryBuilder;
  gt: (column: string, value: string) => QueryBuilder;
  in: (column: string, values: string[]) => QueryBuilder;
  lt: (column: string, value: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  select: (columns: string) => QueryBuilder;
};

type CalendarSupabaseClient = {
  from: (table: string) => QueryBuilder;
};

const eventColumns =
  'id, couple_id, created_by, title, description, starts_at, ends_at, is_all_day, created_at, updated_at';

async function runQuery<T>(query: QueryBuilder): Promise<QueryResponse<T>> {
  const { data, error } = await query;

  return {
    data: data as T,
    error,
  };
}

function throwQueryError(error: QueryError): never {
  throw new Error(error.message);
}

function mapEvent(row: CalendarEventRow, profilesById: Map<string, ProfileNameRow>): CalendarEvent {
  return {
    coupleId: row.couple_id,
    createdAt: row.created_at,
    createdBy: row.created_by,
    creatorDisplayName: profilesById.get(row.created_by)?.display_name ?? null,
    description: row.description,
    endsAt: row.ends_at,
    id: row.id,
    isAllDay: row.is_all_day,
    startsAt: row.starts_at,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

async function getProfilesById(
  client: unknown,
  userIds: string[],
): Promise<Map<string, ProfileNameRow>> {
  const uniqueUserIds = [...new Set(userIds)];

  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const db = client as CalendarSupabaseClient;
  const { data, error } = await runQuery<ProfileNameRow[]>(
    db.from('profiles').select('id, display_name').in('id', uniqueUserIds),
  );

  if (error) {
    throwQueryError(error);
  }

  return new Map(data.map((profile) => [profile.id, profile]));
}

export function createSupabaseCalendarRepository(client: unknown): CalendarRepository {
  const db = client as CalendarSupabaseClient;

  return {
    async listEventsForCouple({ coupleId, rangeEnd, rangeStart }) {
      const { data, error } = await runQuery<CalendarEventRow[]>(
        db
          .from('calendar_events')
          .select(eventColumns)
          .eq('couple_id', coupleId)
          .lt('starts_at', rangeEnd)
          .gt('ends_at', rangeStart)
          .order('starts_at', { ascending: true })
          .order('title', { ascending: true }),
      );

      if (error) {
        throwQueryError(error);
      }

      const profilesById = await getProfilesById(
        client,
        data.map((event) => event.created_by),
      );

      return data.map((event) => mapEvent(event, profilesById));
    },
  };
}
