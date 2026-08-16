import { describe, expect, it } from 'vitest';

import { createSupabaseCalendarRepository } from './calendarService';

type FakeValue = boolean | null | number | string;
type FakeMutationValue = FakeValue;
type FakeRow = Record<string, FakeValue>;
type QueryResponse = {
  count?: number | null;
  data: unknown;
  error: { message: string } | null;
};
type Filter =
  | {
      column: string;
      kind: 'eq' | 'gt' | 'lt';
      value: FakeValue;
    }
  | {
      column: string;
      kind: 'in';
      values: string[];
    };
type QueryLogEntry = {
  filters: Filter[];
  mutation:
    | {
        kind: 'insert';
        values: Record<string, FakeMutationValue>;
      }
    | {
        kind: 'update';
        options?: { count?: 'exact' } | undefined;
        values: Record<string, FakeMutationValue>;
      }
    | null;
  orders: { ascending: boolean; column: string }[];
  resultMode: 'array' | 'maybeSingle' | 'single';
  select: string | null;
  table: string;
};

function compareValues(left: FakeValue | undefined, right: FakeValue, kind: 'gt' | 'lt') {
  return (
    typeof left === 'string' &&
    typeof right === 'string' &&
    (kind === 'gt' ? left > right : left < right)
  );
}

function createFakeSupabase(tables: Record<string, FakeRow[]>) {
  const queryLog: QueryLogEntry[] = [];

  return {
    client: {
      from(table: string) {
        const entry: QueryLogEntry = {
          filters: [],
          mutation: null,
          orders: [],
          resultMode: 'array',
          select: null,
          table,
        };
        queryLog.push(entry);

        const builder = {
          eq(column: string, value: FakeValue) {
            entry.filters.push({ column, kind: 'eq', value });
            return builder;
          },
          gt(column: string, value: string) {
            entry.filters.push({ column, kind: 'gt', value });
            return builder;
          },
          in(column: string, values: string[]) {
            entry.filters.push({ column, kind: 'in', values });
            return builder;
          },
          insert(values: Record<string, FakeMutationValue>) {
            entry.mutation = { kind: 'insert', values };
            return builder;
          },
          lt(column: string, value: string) {
            entry.filters.push({ column, kind: 'lt', value });
            return builder;
          },
          maybeSingle() {
            entry.resultMode = 'maybeSingle';
            return builder;
          },
          order(column: string, options?: { ascending?: boolean }) {
            entry.orders.push({ ascending: options?.ascending ?? true, column });
            return builder;
          },
          select(columns: string) {
            entry.select = columns;
            return builder;
          },
          single() {
            entry.resultMode = 'single';
            return builder;
          },
          update(values: Record<string, FakeMutationValue>, options?: { count?: 'exact' }) {
            entry.mutation = { kind: 'update', options, values };
            return builder;
          },
          then<TResult1 = QueryResponse, TResult2 = never>(
            onfulfilled?: ((value: QueryResponse) => PromiseLike<TResult1> | TResult1) | null,
            onrejected?: ((reason: unknown) => PromiseLike<TResult2> | TResult2) | null,
          ) {
            const tableRows = tables[table] ?? [];
            let rows = [...tableRows].filter((row) =>
              entry.filters.every((filter) => {
                const value = row[filter.column];

                if (filter.kind === 'eq') {
                  return value === filter.value;
                }

                if (filter.kind === 'in') {
                  return typeof value === 'string' && filter.values.includes(value);
                }

                return compareValues(value, filter.value, filter.kind);
              }),
            );
            let count: number | null = null;

            if (entry.mutation?.kind === 'insert') {
              const now = '2026-08-12T16:00:00.000Z';
              const insertedRow: FakeRow = {
                created_at: now,
                id: 'created-event',
                updated_at: now,
                updated_by: null,
                version: 1,
                ...entry.mutation.values,
              };

              tableRows.push(insertedRow);
              rows = [insertedRow];
              count = 1;
            }

            if (entry.mutation?.kind === 'update') {
              count = rows.length;
              rows = rows.map((row) => {
                Object.assign(row, entry.mutation?.values);

                if (typeof row.version === 'number') {
                  row.version += 1;
                } else if (typeof row.version === 'string') {
                  row.version = Number.parseInt(row.version, 10) + 1;
                }

                row.updated_at = '2026-08-12T16:30:00.000Z';

                return row;
              });
            }

            rows = rows.sort((left, right) => {
              for (const order of entry.orders) {
                const leftValue = left[order.column];
                const rightValue = right[order.column];

                if (typeof leftValue !== 'string' || typeof rightValue !== 'string') {
                  continue;
                }

                const comparison = leftValue.localeCompare(rightValue);

                if (comparison !== 0) {
                  return order.ascending ? comparison : -comparison;
                }
              }

              return 0;
            });
            const data =
              entry.resultMode === 'array'
                ? rows
                : entry.resultMode === 'single'
                  ? (rows[0] ?? null)
                  : (rows[0] ?? null);

            return Promise.resolve<QueryResponse>({
              count,
              data,
              error: null,
            }).then(onfulfilled, onrejected);
          },
        };

        return builder;
      },
    },
    queryLog,
  };
}

describe('createSupabaseCalendarRepository', () => {
  it('queries overlapping events for a couple and maps creator display names', async () => {
    const { client, queryLog } = createFakeSupabase({
      calendar_events: [
        {
          couple_id: 'couple-1',
          created_at: '2026-08-01T00:00:00.000Z',
          created_by: 'user-2',
          description: 'Reservation at 7',
          ends_at: '2026-08-12T02:00:00.000Z',
          id: 'event-2',
          is_all_day: false,
          location: 'Downtown',
          starts_at: '2026-08-12T01:00:00.000Z',
          status: 'active',
          timezone: 'America/Chicago',
          title: 'Dinner',
          updated_at: '2026-08-01T00:00:00.000Z',
          updated_by: null,
          version: 1,
        },
        {
          couple_id: 'couple-1',
          created_at: '2026-08-01T00:00:00.000Z',
          created_by: 'user-1',
          description: null,
          ends_at: '2026-08-11T15:30:00.000Z',
          id: 'event-1',
          is_all_day: false,
          location: null,
          starts_at: '2026-08-11T15:00:00.000Z',
          status: 'active',
          timezone: 'America/Chicago',
          title: 'Coffee',
          updated_at: '2026-08-01T00:00:00.000Z',
          updated_by: null,
          version: 2,
        },
        {
          couple_id: 'couple-1',
          created_at: '2026-08-01T00:00:00.000Z',
          created_by: 'user-1',
          description: null,
          ends_at: '2026-08-01T00:00:00.000Z',
          id: 'event-before',
          is_all_day: false,
          location: null,
          starts_at: '2026-07-31T23:00:00.000Z',
          status: 'active',
          timezone: 'America/Chicago',
          title: 'Before range',
          updated_at: '2026-08-01T00:00:00.000Z',
          updated_by: null,
          version: 1,
        },
        {
          couple_id: 'couple-2',
          created_at: '2026-08-01T00:00:00.000Z',
          created_by: 'user-3',
          description: null,
          ends_at: '2026-08-11T15:30:00.000Z',
          id: 'event-other-couple',
          is_all_day: false,
          location: null,
          starts_at: '2026-08-11T15:00:00.000Z',
          status: 'active',
          timezone: 'America/Chicago',
          title: 'Other couple',
          updated_at: '2026-08-01T00:00:00.000Z',
          updated_by: null,
          version: 1,
        },
      ],
      profiles: [
        {
          display_name: 'Alex',
          id: 'user-1',
        },
        {
          display_name: 'Jordan',
          id: 'user-2',
        },
      ],
    });

    const events = await createSupabaseCalendarRepository(client).listEventsForCouple({
      coupleId: 'couple-1',
      rangeEnd: '2026-09-01T00:00:00.000Z',
      rangeStart: '2026-08-01T00:00:00.000Z',
    });

    expect(events.map((event) => [event.title, event.creatorDisplayName])).toEqual([
      ['Coffee', 'Alex'],
      ['Dinner', 'Jordan'],
    ]);
    expect(queryLog[0]).toMatchObject({
      filters: [
        { column: 'couple_id', kind: 'eq', value: 'couple-1' },
        { column: 'status', kind: 'eq', value: 'active' },
        { column: 'starts_at', kind: 'lt', value: '2026-09-01T00:00:00.000Z' },
        { column: 'ends_at', kind: 'gt', value: '2026-08-01T00:00:00.000Z' },
      ],
      orders: [
        { ascending: true, column: 'starts_at' },
        { ascending: true, column: 'title' },
      ],
      table: 'calendar_events',
    });
    expect(queryLog[1]).toMatchObject({
      filters: [{ column: 'id', kind: 'in', values: ['user-1', 'user-2'] }],
      table: 'profiles',
    });
  });

  it('creates an event and maps the inserted row', async () => {
    const { client, queryLog } = createFakeSupabase({
      calendar_events: [],
      profiles: [
        {
          display_name: 'Alex',
          id: 'user-1',
        },
      ],
    });

    const event = await createSupabaseCalendarRepository(client).createEvent({
      coupleId: 'couple-1',
      createdBy: 'user-1',
      description: 'Bring tickets',
      endsAt: '2026-08-12T23:00:00.000Z',
      isAllDay: false,
      location: 'Cinema',
      startsAt: '2026-08-12T21:00:00.000Z',
      timeZone: 'America/Chicago',
      title: 'Movie night',
    });

    expect(event).toMatchObject({
      coupleId: 'couple-1',
      createdBy: 'user-1',
      creatorDisplayName: 'Alex',
      location: 'Cinema',
      title: 'Movie night',
      version: 1,
    });
    const createQuery = queryLog[0];
    const createMutation = createQuery?.mutation;

    expect(createQuery).toMatchObject({
      resultMode: 'single',
      table: 'calendar_events',
    });
    expect(createMutation?.kind).toBe('insert');

    if (!createMutation || createMutation.kind !== 'insert') {
      throw new Error('expected_insert_mutation');
    }

    expect(createMutation.values).toMatchObject({
      couple_id: 'couple-1',
      created_by: 'user-1',
      timezone: 'America/Chicago',
    });
  });

  it('updates an event with the expected version predicate', async () => {
    const { client, queryLog } = createFakeSupabase({
      calendar_events: [
        {
          couple_id: 'couple-1',
          created_at: '2026-08-01T00:00:00.000Z',
          created_by: 'user-1',
          description: null,
          ends_at: '2026-08-12T22:00:00.000Z',
          id: 'event-1',
          is_all_day: false,
          location: null,
          starts_at: '2026-08-12T21:00:00.000Z',
          status: 'active',
          timezone: 'America/Chicago',
          title: 'Dinner',
          updated_at: '2026-08-01T00:00:00.000Z',
          updated_by: null,
          version: 3,
        },
      ],
      profiles: [
        {
          display_name: 'Alex',
          id: 'user-1',
        },
      ],
    });

    const event = await createSupabaseCalendarRepository(client).updateEvent({
      coupleId: 'couple-1',
      description: 'Updated notes',
      endsAt: '2026-08-12T23:00:00.000Z',
      eventId: 'event-1',
      expectedVersion: 3,
      isAllDay: false,
      location: 'New spot',
      startsAt: '2026-08-12T21:30:00.000Z',
      timeZone: 'America/Chicago',
      title: 'Dinner updated',
    });

    expect(event).toMatchObject({
      description: 'Updated notes',
      location: 'New spot',
      title: 'Dinner updated',
      version: 4,
    });
    const updateQuery = queryLog[0];
    const updateMutation = updateQuery?.mutation;

    expect(updateQuery).toMatchObject({
      filters: [
        { column: 'id', kind: 'eq', value: 'event-1' },
        { column: 'couple_id', kind: 'eq', value: 'couple-1' },
        { column: 'version', kind: 'eq', value: 3 },
        { column: 'status', kind: 'eq', value: 'active' },
      ],
      resultMode: 'maybeSingle',
      table: 'calendar_events',
    });
    expect(updateMutation?.kind).toBe('update');

    if (!updateMutation || updateMutation.kind !== 'update') {
      throw new Error('expected_update_mutation');
    }

    expect(updateMutation.values).toMatchObject({
      title: 'Dinner updated',
    });
  });

  it('soft deletes an event with the expected version predicate', async () => {
    const { client, queryLog } = createFakeSupabase({
      calendar_events: [
        {
          couple_id: 'couple-1',
          created_at: '2026-08-01T00:00:00.000Z',
          created_by: 'user-1',
          description: null,
          ends_at: '2026-08-12T22:00:00.000Z',
          id: 'event-1',
          is_all_day: false,
          location: null,
          starts_at: '2026-08-12T21:00:00.000Z',
          status: 'active',
          timezone: 'America/Chicago',
          title: 'Dinner',
          updated_at: '2026-08-01T00:00:00.000Z',
          updated_by: null,
          version: 3,
        },
      ],
    });

    await createSupabaseCalendarRepository(client).deleteEvent({
      coupleId: 'couple-1',
      eventId: 'event-1',
      expectedVersion: 3,
    });

    const deleteQuery = queryLog[0];
    const deleteMutation = deleteQuery?.mutation;

    expect(deleteQuery).toMatchObject({
      filters: [
        { column: 'id', kind: 'eq', value: 'event-1' },
        { column: 'couple_id', kind: 'eq', value: 'couple-1' },
        { column: 'version', kind: 'eq', value: 3 },
        { column: 'status', kind: 'eq', value: 'active' },
      ],
      table: 'calendar_events',
    });
    expect(deleteMutation?.kind).toBe('update');

    if (!deleteMutation || deleteMutation.kind !== 'update') {
      throw new Error('expected_delete_mutation');
    }

    expect(deleteMutation.values).toMatchObject({
      status: 'deleted',
    });
  });
});
