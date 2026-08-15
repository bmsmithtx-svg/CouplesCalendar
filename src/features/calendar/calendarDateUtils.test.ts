import { describe, expect, it } from 'vitest';

import {
  addCalendarMonths,
  buildMonthGrid,
  getCalendarDateInTimeZone,
  getEventDateKeys,
  getVisibleGridUtcRange,
  sortEventsForAgenda,
} from './calendarDateUtils';
import type { CalendarEvent } from './calendarTypes';

function createEvent(
  input: Partial<CalendarEvent> & Pick<CalendarEvent, 'endsAt' | 'startsAt' | 'title'>,
): CalendarEvent {
  return {
    coupleId: input.coupleId ?? 'couple-1',
    createdAt: input.createdAt ?? '2026-08-01T00:00:00.000Z',
    createdBy: input.createdBy ?? 'user-1',
    creatorDisplayName: input.creatorDisplayName ?? 'Alex',
    description: input.description ?? null,
    endsAt: input.endsAt,
    id: input.id ?? input.title,
    isAllDay: input.isAllDay ?? false,
    startsAt: input.startsAt,
    title: input.title,
    updatedAt: input.updatedAt ?? '2026-08-01T00:00:00.000Z',
  };
}

describe('calendar date utilities', () => {
  it('builds a Monday-aligned six-week month grid with adjacent dates', () => {
    const cells = buildMonthGrid({
      month: { month: 8, year: 2026 },
      selectedDate: { day: 12, month: 8, year: 2026 },
      today: { day: 12, month: 8, year: 2026 },
    });

    expect(cells).toHaveLength(42);
    expect(cells[0]?.key).toBe('2026-07-27');
    expect(cells[5]?.key).toBe('2026-08-01');
    expect(cells.at(-1)?.key).toBe('2026-09-06');
    expect(cells.find((cell) => cell.key === '2026-08-12')).toMatchObject({
      isSelected: true,
      isToday: true,
    });
  });

  it('uses the configured timezone for today rather than slicing UTC timestamps', () => {
    expect(
      getCalendarDateInTimeZone(new Date('2026-08-13T04:30:00.000Z'), 'America/Chicago'),
    ).toEqual({
      day: 12,
      month: 8,
      year: 2026,
    });
  });

  it('creates UTC query boundaries from the visible local calendar grid', () => {
    const cells = buildMonthGrid({
      month: { month: 8, year: 2026 },
      selectedDate: { day: 12, month: 8, year: 2026 },
      today: { day: 12, month: 8, year: 2026 },
    });

    expect(getVisibleGridUtcRange(cells, 'America/Chicago')).toEqual({
      rangeEnd: '2026-09-07T05:00:00.000Z',
      rangeStart: '2026-07-27T05:00:00.000Z',
    });
  });

  it('clamps month navigation when the target month has fewer days', () => {
    expect(addCalendarMonths({ day: 31, month: 1, year: 2026 }, 1)).toEqual({
      day: 28,
      month: 2,
      year: 2026,
    });
  });

  it('maps events to local dates and treats ends_at as exclusive for midnight boundaries', () => {
    expect(
      getEventDateKeys(
        {
          endsAt: '2026-08-13T05:30:00.000Z',
          startsAt: '2026-08-13T04:30:00.000Z',
        },
        'America/Chicago',
      ),
    ).toEqual(['2026-08-12', '2026-08-13']);

    expect(
      getEventDateKeys(
        {
          endsAt: '2026-08-13T05:00:00.000Z',
          startsAt: '2026-08-12T05:00:00.000Z',
        },
        'America/Chicago',
      ),
    ).toEqual(['2026-08-12']);
  });

  it('orders agenda events with all-day entries first and timed entries chronologically', () => {
    const sorted = sortEventsForAgenda([
      createEvent({
        endsAt: '2026-08-12T22:00:00.000Z',
        startsAt: '2026-08-12T21:00:00.000Z',
        title: 'Dinner',
      }),
      createEvent({
        endsAt: '2026-08-13T05:00:00.000Z',
        isAllDay: true,
        startsAt: '2026-08-12T05:00:00.000Z',
        title: 'Anniversary',
      }),
      createEvent({
        endsAt: '2026-08-12T15:30:00.000Z',
        startsAt: '2026-08-12T15:00:00.000Z',
        title: 'Coffee',
      }),
    ]);

    expect(sorted.map((event) => event.title)).toEqual(['Anniversary', 'Coffee', 'Dinner']);
  });
});
