import { isValidTimeZone } from '../../lib/timezones';
import {
  addCalendarDays,
  compareCalendarDates,
  getDateInputValueInTimeZone,
  getDateStartInTimeZone,
  getDateTimeInTimeZone,
  getInclusiveAllDayEndDateKey,
  getTimeInputValueInTimeZone,
  parseDateKey,
  toDateKey,
  type CalendarDate,
  type CalendarTime,
} from './calendarDateUtils';
import type { CalendarEvent, CalendarEventWritable } from './calendarTypes';
import {
  defaultCalendarEventCategory,
  isCalendarEventCategory,
  type CalendarEventCategory,
} from './eventCategories';
import {
  buildRecurrenceRule,
  getOccurrenceSeriesEnd,
  getOccurrenceSeriesStart,
  getRecurrenceFormValues,
  getRecurrenceUntilDateEnd,
  isRecurrenceEndBeforeStart,
  recurrenceFrequencies,
  type RecurrenceFormFrequency,
} from './eventRecurrence';

export type CalendarEventFormInput = {
  category: CalendarEventCategory;
  description: string;
  endDate: string;
  endTime: string;
  isAllDay: boolean;
  location: string;
  recurrenceEndDate: string;
  recurrenceFrequency: RecurrenceFormFrequency;
  startDate: string;
  startTime: string;
  timeZone: string;
  title: string;
};

export type CalendarEventFieldErrors = Partial<Record<keyof CalendarEventFormInput, string>>;

export type CalendarEventValidationResult =
  | {
      errors: CalendarEventFieldErrors;
      ok: false;
    }
  | {
      ok: true;
      values: CalendarEventWritable;
    };

const defaultStartTime = '09:00';
const defaultEndTime = '10:00';
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;
const recurrenceFrequencyValues = new Set<string>(['none', ...recurrenceFrequencies]);

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function parseDateInput(value: string): CalendarDate | null {
  if (!datePattern.test(value)) {
    return null;
  }

  const date = parseDateKey(value);
  const roundTrip = toDateKey(date);

  if (roundTrip !== value) {
    return null;
  }

  const candidate = new Date(Date.UTC(date.year, date.month - 1, date.day, 12));

  if (
    candidate.getUTCFullYear() !== date.year ||
    candidate.getUTCMonth() + 1 !== date.month ||
    candidate.getUTCDate() !== date.day
  ) {
    return null;
  }

  return date;
}

function parseTimeInput(value: string): CalendarTime | null {
  if (!timePattern.test(value)) {
    return null;
  }

  const [hourValue = '', minuteValue = ''] = value.split(':');
  const hour = Number.parseInt(hourValue, 10);
  const minute = Number.parseInt(minuteValue, 10);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

export function getDefaultCalendarEventFormInput({
  selectedDate,
  timeZone,
}: {
  selectedDate: CalendarDate;
  timeZone: string;
}): CalendarEventFormInput {
  const dateKey = toDateKey(selectedDate);

  return {
    category: defaultCalendarEventCategory,
    description: '',
    endDate: dateKey,
    endTime: defaultEndTime,
    isAllDay: false,
    location: '',
    recurrenceEndDate: '',
    recurrenceFrequency: 'none',
    startDate: dateKey,
    startTime: defaultStartTime,
    timeZone,
    title: '',
  };
}

export function getCalendarEventFormInputFromEvent(event: CalendarEvent): CalendarEventFormInput {
  const timeZone = event.timeZone;
  const startsAt = getOccurrenceSeriesStart(event);
  const endsAt = getOccurrenceSeriesEnd(event);
  const recurrence = getRecurrenceFormValues({
    recurrenceEndsAt: event.recurrenceEndsAt,
    recurrenceRule: event.recurrenceRule,
    timeZone,
  });
  const startDate = getDateInputValueInTimeZone(startsAt, timeZone);
  const endDate = event.isAllDay
    ? getInclusiveAllDayEndDateKey({ endsAt, timeZone })
    : getDateInputValueInTimeZone(endsAt, timeZone);

  return {
    category: event.category,
    description: event.description ?? '',
    endDate,
    endTime: event.isAllDay ? defaultEndTime : getTimeInputValueInTimeZone(endsAt, timeZone),
    isAllDay: event.isAllDay,
    location: event.location ?? '',
    recurrenceEndDate: recurrence.untilDate,
    recurrenceFrequency: recurrence.frequency,
    startDate,
    startTime: event.isAllDay ? defaultStartTime : getTimeInputValueInTimeZone(startsAt, timeZone),
    timeZone,
    title: event.title,
  };
}

export function validateCalendarEventFormInput(
  input: CalendarEventFormInput,
): CalendarEventValidationResult {
  const errors: CalendarEventFieldErrors = {};
  const title = input.title.trim();
  const description = normalizeOptionalText(input.description);
  const location = normalizeOptionalText(input.location);
  const category = input.category;
  const recurrenceFrequency = input.recurrenceFrequency;
  const recurrenceEndDate = input.recurrenceEndDate.trim();
  const timeZone = input.timeZone.trim();
  const startDate = parseDateInput(input.startDate);
  const endDate = parseDateInput(input.endDate);
  const parsedRecurrenceEndDate = recurrenceEndDate ? parseDateInput(recurrenceEndDate) : null;
  const startTime = input.isAllDay ? { hour: 0, minute: 0 } : parseTimeInput(input.startTime);
  const endTime = input.isAllDay ? { hour: 0, minute: 0 } : parseTimeInput(input.endTime);

  if (!isCalendarEventCategory(category)) {
    errors.category = 'Choose a supported category.';
  }

  if (!recurrenceFrequencyValues.has(recurrenceFrequency)) {
    errors.recurrenceFrequency = 'Choose a supported repeat option.';
  }

  if (title.length === 0) {
    errors.title = 'Enter an event title.';
  } else if (title.length > 140) {
    errors.title = 'Keep the title to 140 characters or fewer.';
  }

  if (description && description.length > 5000) {
    errors.description = 'Keep notes to 5000 characters or fewer.';
  }

  if (location && location.length > 500) {
    errors.location = 'Keep the location to 500 characters or fewer.';
  }

  if (!isValidTimeZone(timeZone)) {
    errors.timeZone = 'Choose a valid timezone.';
  }

  if (!startDate) {
    errors.startDate = 'Enter a valid start date.';
  }

  if (!endDate) {
    errors.endDate = 'Enter a valid end date.';
  }

  if (recurrenceEndDate && !parsedRecurrenceEndDate) {
    errors.recurrenceEndDate = 'Enter a valid recurrence end date.';
  }

  if (!input.isAllDay && !startTime) {
    errors.startTime = 'Enter a valid start time.';
  }

  if (!input.isAllDay && !endTime) {
    errors.endTime = 'Enter a valid end time.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      errors,
      ok: false,
    };
  }

  if (!startDate || !endDate || !startTime || !endTime) {
    return {
      errors,
      ok: false,
    };
  }

  const startsAt = input.isAllDay
    ? getDateStartInTimeZone(startDate, timeZone)
    : getDateTimeInTimeZone(startDate, startTime, timeZone);
  const endsAt = input.isAllDay
    ? getDateStartInTimeZone(addCalendarDays(endDate, 1), timeZone)
    : getDateTimeInTimeZone(endDate, endTime, timeZone);

  if (input.isAllDay) {
    if (compareCalendarDates(endDate, startDate) < 0) {
      return {
        errors: {
          endDate: 'End date cannot be before start date.',
        },
        ok: false,
      };
    }
  } else if (endsAt.getTime() <= startsAt.getTime()) {
    return {
      errors: {
        endTime: 'End time must be after start time.',
      },
      ok: false,
    };
  }

  if (
    recurrenceFrequency !== 'none' &&
    recurrenceEndDate &&
    isRecurrenceEndBeforeStart({
      recurrenceEndDate,
      startDate: input.startDate,
    })
  ) {
    return {
      errors: {
        recurrenceEndDate: 'Repeat end date cannot be before the first occurrence.',
      },
      ok: false,
    };
  }

  const recurrenceEndsAt =
    recurrenceFrequency !== 'none' && parsedRecurrenceEndDate
      ? getRecurrenceUntilDateEnd({ dateKey: recurrenceEndDate, timeZone }).toISOString()
      : null;
  const recurrenceRule = buildRecurrenceRule({
    frequency: recurrenceFrequency,
    until: recurrenceEndsAt,
  });

  if (recurrenceFrequency !== 'none' && !recurrenceRule) {
    return {
      errors: {
        recurrenceFrequency: 'Choose a supported repeat option.',
      },
      ok: false,
    };
  }

  return {
    ok: true,
    values: {
      category,
      description,
      endsAt: endsAt.toISOString(),
      isAllDay: input.isAllDay,
      location,
      recurrenceEndsAt,
      recurrenceRule,
      startsAt: startsAt.toISOString(),
      timeZone,
      title,
    },
  };
}
