import type {
  CalendarEvent,
  CalendarEventCreateInput,
  CalendarEventDeleteInput,
  CalendarEventUpdateInput,
  CalendarRepository,
} from './calendarTypes';

type CalendarEventRow = {
  couple_id: string;
  created_at: string;
  created_by: string;
  description: string | null;
  deleted_at?: string | null;
  ends_at: string;
  id: string;
  is_all_day: boolean;
  location: string | null;
  starts_at: string;
  status?: string;
  timezone: string;
  title: string;
  updated_at: string;
  updated_by: string | null;
  version: number;
};

type ProfileNameRow = {
  display_name: string;
  id: string;
};

type QueryError = {
  message: string;
};

type QueryResponse<T> = {
  count?: number | null;
  data: T;
  error: QueryError | null;
};

type QueryBuilder = PromiseLike<QueryResponse<unknown>> & {
  eq: (column: string, value: boolean | number | string) => QueryBuilder;
  gt: (column: string, value: string) => QueryBuilder;
  in: (column: string, values: string[]) => QueryBuilder;
  insert: (values: Record<string, unknown>) => QueryBuilder;
  lt: (column: string, value: string) => QueryBuilder;
  maybeSingle: () => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  select: (columns: string) => QueryBuilder;
  single: () => QueryBuilder;
  update: (values: Record<string, unknown>, options?: { count?: 'exact' }) => QueryBuilder;
};

type CalendarSupabaseClient = {
  from: (table: string) => QueryBuilder;
};

const eventColumns =
  'id, couple_id, created_by, updated_by, title, description, location, starts_at, ends_at, is_all_day, timezone, version, created_at, updated_at';

async function runQuery<T>(query: QueryBuilder): Promise<QueryResponse<T>> {
  const { count, data, error } = await query;
  const response: QueryResponse<T> = {
    data: data as T,
    error,
  };

  if (count !== undefined) {
    response.count = count;
  }

  return response;
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
    location: row.location,
    startsAt: row.starts_at,
    timeZone: row.timezone,
    title: row.title,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    version: row.version,
  };
}

function mapWritableEvent(input: CalendarEventCreateInput | CalendarEventUpdateInput) {
  return {
    description: input.description,
    ends_at: input.endsAt,
    is_all_day: input.isAllDay,
    location: input.location,
    starts_at: input.startsAt,
    timezone: input.timeZone,
    title: input.title,
  };
}

function throwConflictError(): never {
  throw new Error('calendar_event_conflict');
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
    async createEvent(input) {
      const { data, error } = await runQuery<CalendarEventRow>(
        db
          .from('calendar_events')
          .insert({
            ...mapWritableEvent(input),
            couple_id: input.coupleId,
            created_by: input.createdBy,
          })
          .select(eventColumns)
          .single(),
      );

      if (error) {
        throwQueryError(error);
      }

      const profilesById = await getProfilesById(client, [data.created_by]);

      return mapEvent(data, profilesById);
    },

    async deleteEvent({ coupleId, eventId, expectedVersion }: CalendarEventDeleteInput) {
      const { count, error } = await runQuery<null>(
        db
          .from('calendar_events')
          .update(
            {
              deleted_at: new Date().toISOString(),
              status: 'deleted',
            },
            { count: 'exact' },
          )
          .eq('id', eventId)
          .eq('couple_id', coupleId)
          .eq('version', expectedVersion)
          .eq('status', 'active'),
      );

      if (error) {
        throwQueryError(error);
      }

      if (count === 0) {
        throwConflictError();
      }
    },

    async listEventsForCouple({ coupleId, rangeEnd, rangeStart }) {
      const { data, error } = await runQuery<CalendarEventRow[]>(
        db
          .from('calendar_events')
          .select(eventColumns)
          .eq('couple_id', coupleId)
          .eq('status', 'active')
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

    async updateEvent(input) {
      const { data, error } = await runQuery<CalendarEventRow | null>(
        db
          .from('calendar_events')
          .update(mapWritableEvent(input), { count: 'exact' })
          .eq('id', input.eventId)
          .eq('couple_id', input.coupleId)
          .eq('version', input.expectedVersion)
          .eq('status', 'active')
          .select(eventColumns)
          .maybeSingle(),
      );

      if (error) {
        throwQueryError(error);
      }

      if (!data) {
        throwConflictError();
      }

      const profilesById = await getProfilesById(client, [data.created_by]);

      return mapEvent(data, profilesById);
    },
  };
}
