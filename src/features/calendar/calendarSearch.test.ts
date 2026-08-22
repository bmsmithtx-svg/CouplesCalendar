import { describe, expect, it } from 'vitest';

import { filterCalendarEvents } from './calendarSearch';
import type { CalendarEvent } from './calendarTypes';

function createEvent(input: Partial<CalendarEvent> & Pick<CalendarEvent, 'title'>): CalendarEvent {
  return {
    category: input.category ?? 'personal',
    coupleId: 'couple-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    createdBy: 'user-1',
    creatorDisplayName: 'Alex',
    description: input.description ?? null,
    endsAt: input.endsAt ?? '2026-08-12T23:00:00.000Z',
    id: input.id ?? input.title,
    isAllDay: input.isAllDay ?? false,
    location: input.location ?? null,
    recurrenceEndsAt: input.recurrenceEndsAt ?? null,
    recurrenceRule: input.recurrenceRule ?? null,
    startsAt: input.startsAt ?? '2026-08-12T21:00:00.000Z',
    timeZone: input.timeZone ?? 'America/Chicago',
    title: input.title,
    updatedAt: '2026-08-01T00:00:00.000Z',
    updatedBy: null,
    version: 1,
  };
}

describe('calendar search', () => {
  it('matches title, description, location, and category labels case-insensitively', () => {
    const events = [
      createEvent({ category: 'date', location: 'Downtown', title: 'Dinner' }),
      createEvent({ category: 'work', description: 'Budget review', title: 'Planning' }),
      createEvent({ category: 'travel', title: 'Flight' }),
    ];

    expect(filterCalendarEvents(events, { categories: [], query: 'dinn' })).toHaveLength(1);
    expect(filterCalendarEvents(events, { categories: [], query: 'BUDGET' })).toHaveLength(1);
    expect(filterCalendarEvents(events, { categories: [], query: 'town' })).toHaveLength(1);
    expect(filterCalendarEvents(events, { categories: [], query: 'travel' })).toHaveLength(1);
  });

  it('combines category filters with search text without duplicating recurring series', () => {
    const events = [
      createEvent({
        category: 'date',
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        title: 'Movie night',
      }),
      createEvent({ category: 'work', title: 'Movie budget' }),
    ];

    expect(filterCalendarEvents(events, { categories: ['date'], query: 'movie' })).toEqual([
      expect.objectContaining({
        id: 'Movie night',
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
      }),
    ]);
  });
});
