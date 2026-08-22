import { describe, expect, it } from 'vitest';

import type { CalendarEvent } from './calendarTypes';
import {
  buildRecurrenceRule,
  expandRecurringEventsForRange,
  getRecurrenceUntilDateEnd,
  isSupportedRecurrenceRule,
  parseRecurrenceRule,
} from './eventRecurrence';

function createEvent(input: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    category: input.category ?? 'personal',
    coupleId: 'couple-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    createdBy: 'user-1',
    creatorDisplayName: 'Alex',
    description: input.description ?? null,
    endsAt: input.endsAt ?? '2026-08-12T15:00:00.000Z',
    id: input.id ?? 'event-1',
    isAllDay: input.isAllDay ?? false,
    location: input.location ?? null,
    recurrenceEndsAt: input.recurrenceEndsAt ?? null,
    recurrenceRule: input.recurrenceRule ?? null,
    startsAt: input.startsAt ?? '2026-08-12T14:00:00.000Z',
    timeZone: input.timeZone ?? 'America/Chicago',
    title: input.title ?? 'Planning',
    updatedAt: '2026-08-01T00:00:00.000Z',
    updatedBy: null,
    version: 1,
  };
}

describe('event recurrence', () => {
  it('parses and builds the supported RRULE subset strictly', () => {
    const until = getRecurrenceUntilDateEnd({
      dateKey: '2026-08-31',
      timeZone: 'America/Chicago',
    }).toISOString();

    expect(buildRecurrenceRule({ frequency: 'weekly', until })).toBe(
      'FREQ=WEEKLY;INTERVAL=1;UNTIL=20260901T045900Z',
    );
    expect(parseRecurrenceRule('FREQ=DAILY;INTERVAL=1')).toEqual({
      frequency: 'daily',
      interval: 1,
      until: null,
    });
    expect(isSupportedRecurrenceRule('FREQ=YEARLY;INTERVAL=1')).toBe(false);
    expect(isSupportedRecurrenceRule('FREQ=WEEKLY;INTERVAL=2')).toBe(false);
    expect(isSupportedRecurrenceRule('FREQ=WEEKLY;COUNT=10')).toBe(false);
  });

  it('leaves non-recurring events unchanged inside the requested range', () => {
    const event = createEvent({ recurrenceRule: null });

    expect(
      expandRecurringEventsForRange({
        events: [event],
        rangeEnd: '2026-08-13T00:00:00.000Z',
        rangeStart: '2026-08-12T00:00:00.000Z',
      }),
    ).toEqual([event]);
  });

  it('expands daily and weekly recurrence with optional end dates', () => {
    const daily = createEvent({
      id: 'daily',
      recurrenceEndsAt: '2026-08-14T04:59:00.000Z',
      recurrenceRule: 'FREQ=DAILY;INTERVAL=1;UNTIL=20260814T045900Z',
    });
    const weekly = createEvent({
      id: 'weekly',
      recurrenceRule: 'FREQ=WEEKLY;INTERVAL=1',
      startsAt: '2026-08-05T14:00:00.000Z',
      endsAt: '2026-08-05T15:00:00.000Z',
    });

    expect(
      expandRecurringEventsForRange({
        events: [daily],
        rangeEnd: '2026-08-16T00:00:00.000Z',
        rangeStart: '2026-08-12T00:00:00.000Z',
      }).map((event) => event.startsAt),
    ).toEqual(['2026-08-12T14:00:00.000Z', '2026-08-13T14:00:00.000Z']);
    expect(
      expandRecurringEventsForRange({
        events: [weekly],
        rangeEnd: '2026-08-13T00:00:00.000Z',
        rangeStart: '2026-08-12T00:00:00.000Z',
      }).map((event) => event.startsAt),
    ).toEqual(['2026-08-12T14:00:00.000Z']);
  });

  it('expands monthly recurrence from the original anchor date and clamps shorter months', () => {
    const events = expandRecurringEventsForRange({
      events: [
        createEvent({
          endsAt: '2026-01-31T16:00:00.000Z',
          recurrenceRule: 'FREQ=MONTHLY;INTERVAL=1',
          startsAt: '2026-01-31T15:00:00.000Z',
          timeZone: 'UTC',
        }),
      ],
      rangeEnd: '2026-04-02T00:00:00.000Z',
      rangeStart: '2026-02-01T00:00:00.000Z',
    });

    expect(events.map((event) => event.startsAt)).toEqual([
      '2026-02-28T15:00:00.000Z',
      '2026-03-31T15:00:00.000Z',
    ]);
  });

  it('preserves local wall time across daylight-saving transitions', () => {
    const events = expandRecurringEventsForRange({
      events: [
        createEvent({
          endsAt: '2026-03-01T16:00:00.000Z',
          recurrenceRule: 'FREQ=WEEKLY;INTERVAL=1',
          startsAt: '2026-03-01T15:00:00.000Z',
          timeZone: 'America/Chicago',
        }),
      ],
      rangeEnd: '2026-03-16T00:00:00.000Z',
      rangeStart: '2026-03-01T00:00:00.000Z',
    });

    expect(events.map((event) => event.startsAt)).toEqual([
      '2026-03-01T15:00:00.000Z',
      '2026-03-08T14:00:00.000Z',
      '2026-03-15T14:00:00.000Z',
    ]);
  });
});
