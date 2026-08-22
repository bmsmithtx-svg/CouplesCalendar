import { describe, expect, it } from 'vitest';

import type { CalendarEvent } from './calendarTypes';
import {
  getCalendarEventFormInputFromEvent,
  getDefaultCalendarEventFormInput,
  validateCalendarEventFormInput,
} from './eventValidation';

function createEvent(input: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    category: input.category ?? 'personal',
    coupleId: 'couple-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    createdBy: 'user-1',
    creatorDisplayName: 'Alex',
    description: input.description ?? null,
    endsAt: input.endsAt ?? '2026-08-12T23:00:00.000Z',
    id: 'event-1',
    isAllDay: input.isAllDay ?? false,
    location: input.location ?? null,
    recurrenceEndsAt: input.recurrenceEndsAt ?? null,
    recurrenceRule: input.recurrenceRule ?? null,
    startsAt: input.startsAt ?? '2026-08-12T21:00:00.000Z',
    timeZone: input.timeZone ?? 'America/Chicago',
    title: input.title ?? 'Dinner',
    updatedAt: '2026-08-01T00:00:00.000Z',
    updatedBy: null,
    version: 1,
  };
}

describe('eventValidation', () => {
  it('maps a valid timed form input to UTC persistence values', () => {
    const result = validateCalendarEventFormInput({
      description: ' Bring tickets ',
      endDate: '2026-08-12',
      endTime: '18:00',
      category: 'date',
      isAllDay: false,
      location: ' Cinema ',
      recurrenceEndDate: '',
      recurrenceFrequency: 'none',
      startDate: '2026-08-12',
      startTime: '16:30',
      timeZone: 'America/Chicago',
      title: ' Movie night ',
    });

    expect(result).toEqual({
      ok: true,
      values: {
        category: 'date',
        description: 'Bring tickets',
        endsAt: '2026-08-12T23:00:00.000Z',
        isAllDay: false,
        location: 'Cinema',
        recurrenceEndsAt: null,
        recurrenceRule: null,
        startsAt: '2026-08-12T21:30:00.000Z',
        timeZone: 'America/Chicago',
        title: 'Movie night',
      },
    });
  });

  it('stores all-day events with exclusive end-date boundaries in the selected timezone', () => {
    const result = validateCalendarEventFormInput({
      description: '',
      endDate: '2026-08-14',
      endTime: '10:00',
      category: 'travel',
      isAllDay: true,
      location: '',
      recurrenceEndDate: '',
      recurrenceFrequency: 'none',
      startDate: '2026-08-12',
      startTime: '09:00',
      timeZone: 'America/Chicago',
      title: 'Trip',
    });

    expect(result).toMatchObject({
      ok: true,
      values: {
        endsAt: '2026-08-15T05:00:00.000Z',
        category: 'travel',
        isAllDay: true,
        recurrenceEndsAt: null,
        recurrenceRule: null,
        startsAt: '2026-08-12T05:00:00.000Z',
      },
    });
  });

  it('rejects missing titles and invalid timed ranges', () => {
    expect(
      validateCalendarEventFormInput({
        description: '',
        endDate: '2026-08-12',
        endTime: '09:00',
        category: 'personal',
        isAllDay: false,
        location: '',
        recurrenceEndDate: '',
        recurrenceFrequency: 'none',
        startDate: '2026-08-12',
        startTime: '09:00',
        timeZone: 'America/Chicago',
        title: ' ',
      }),
    ).toEqual({
      errors: {
        title: 'Enter an event title.',
      },
      ok: false,
    });

    expect(
      validateCalendarEventFormInput({
        description: '',
        endDate: '2026-08-12',
        endTime: '08:59',
        category: 'personal',
        isAllDay: false,
        location: '',
        recurrenceEndDate: '',
        recurrenceFrequency: 'none',
        startDate: '2026-08-12',
        startTime: '09:00',
        timeZone: 'America/Chicago',
        title: 'Breakfast',
      }),
    ).toEqual({
      errors: {
        endTime: 'End time must be after start time.',
      },
      ok: false,
    });
  });

  it('rejects invalid category and recurrence combinations before persistence', () => {
    expect(
      validateCalendarEventFormInput({
        category: 'unsupported' as never,
        description: '',
        endDate: '2026-08-12',
        endTime: '10:00',
        isAllDay: false,
        location: '',
        recurrenceEndDate: '',
        recurrenceFrequency: 'none',
        startDate: '2026-08-12',
        startTime: '09:00',
        timeZone: 'America/Chicago',
        title: 'Breakfast',
      }),
    ).toEqual({
      errors: {
        category: 'Choose a supported category.',
      },
      ok: false,
    });

    expect(
      validateCalendarEventFormInput({
        category: 'personal',
        description: '',
        endDate: '2026-08-12',
        endTime: '10:00',
        isAllDay: false,
        location: '',
        recurrenceEndDate: '2026-08-11',
        recurrenceFrequency: 'daily',
        startDate: '2026-08-12',
        startTime: '09:00',
        timeZone: 'America/Chicago',
        title: 'Breakfast',
      }),
    ).toEqual({
      errors: {
        recurrenceEndDate: 'Repeat end date cannot be before the first occurrence.',
      },
      ok: false,
    });
  });

  it('populates edit inputs without shifting timed or all-day values', () => {
    expect(getCalendarEventFormInputFromEvent(createEvent())).toMatchObject({
      endDate: '2026-08-12',
      endTime: '18:00',
      startDate: '2026-08-12',
      startTime: '16:00',
      timeZone: 'America/Chicago',
    });

    expect(
      getCalendarEventFormInputFromEvent(
        createEvent({
          endsAt: '2026-08-13T05:00:00.000Z',
          isAllDay: true,
          startsAt: '2026-08-12T05:00:00.000Z',
          title: 'Anniversary',
        }),
      ),
    ).toMatchObject({
      endDate: '2026-08-12',
      isAllDay: true,
      startDate: '2026-08-12',
    });
  });

  it('defaults new events to the selected date and profile timezone', () => {
    expect(
      getDefaultCalendarEventFormInput({
        selectedDate: {
          day: 12,
          month: 8,
          year: 2026,
        },
        timeZone: 'America/Chicago',
      }),
    ).toMatchObject({
      endDate: '2026-08-12',
      startDate: '2026-08-12',
      timeZone: 'America/Chicago',
      category: 'personal',
      recurrenceEndDate: '',
      recurrenceFrequency: 'none',
    });
  });
});
