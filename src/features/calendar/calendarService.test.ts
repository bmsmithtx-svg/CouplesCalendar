import { describe, expect, it } from 'vitest';

import { createSupabaseCalendarRepository } from './calendarService';

type FakeValue = boolean | null | string;
type FakeRow = Record<string, FakeValue>;
type QueryResponse = {
  data: unknown;
  error: { message: string } | null;
};
type Filter =
  | {
      column: string;
      kind: 'eq' | 'gt' | 'lt';
      value: string;
    }
  | {
      column: string;
      kind: 'in';
      values: string[];
    };
type QueryLogEntry = {
  filters: Filter[];
  orders: { ascending: boolean; column: string }[];
  select: string | null;
  table: string;
};

function compareValues(left: FakeValue | undefined, right: string, kind: 'gt' | 'lt') {
  return typeof left === 'string' && (kind === 'gt' ? left > right : left < right);
}

function createFakeSupabase(tables: Record<string, FakeRow[]>) {
  const queryLog: QueryLogEntry[] = [];

  return {
    client: {
      from(table: string) {
        const entry: QueryLogEntry = {
          filters: [],
          orders: [],
          select: null,
          table,
        };
        queryLog.push(entry);

        const builder = {
          eq(column: string, value: string) {
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
          lt(column: string, value: string) {
            entry.filters.push({ column, kind: 'lt', value });
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
          then<TResult1 = QueryResponse, TResult2 = never>(
            onfulfilled?: ((value: QueryResponse) => PromiseLike<TResult1> | TResult1) | null,
            onrejected?: ((reason: unknown) => PromiseLike<TResult2> | TResult2) | null,
          ) {
            const rows = [...(tables[table] ?? [])]
              .filter((row) =>
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
              )
              .sort((left, right) => {
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

            return Promise.resolve<QueryResponse>({
              data: rows,
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
          starts_at: '2026-08-12T01:00:00.000Z',
          title: 'Dinner',
          updated_at: '2026-08-01T00:00:00.000Z',
        },
        {
          couple_id: 'couple-1',
          created_at: '2026-08-01T00:00:00.000Z',
          created_by: 'user-1',
          description: null,
          ends_at: '2026-08-11T15:30:00.000Z',
          id: 'event-1',
          is_all_day: false,
          starts_at: '2026-08-11T15:00:00.000Z',
          title: 'Coffee',
          updated_at: '2026-08-01T00:00:00.000Z',
        },
        {
          couple_id: 'couple-1',
          created_at: '2026-08-01T00:00:00.000Z',
          created_by: 'user-1',
          description: null,
          ends_at: '2026-08-01T00:00:00.000Z',
          id: 'event-before',
          is_all_day: false,
          starts_at: '2026-07-31T23:00:00.000Z',
          title: 'Before range',
          updated_at: '2026-08-01T00:00:00.000Z',
        },
        {
          couple_id: 'couple-2',
          created_at: '2026-08-01T00:00:00.000Z',
          created_by: 'user-3',
          description: null,
          ends_at: '2026-08-11T15:30:00.000Z',
          id: 'event-other-couple',
          is_all_day: false,
          starts_at: '2026-08-11T15:00:00.000Z',
          title: 'Other couple',
          updated_at: '2026-08-01T00:00:00.000Z',
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
});
