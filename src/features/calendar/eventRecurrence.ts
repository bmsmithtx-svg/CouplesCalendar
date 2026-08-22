import {
  addCalendarDays,
  addCalendarMonths,
  compareCalendarDates,
  getCalendarDateInTimeZone,
  getDateInputValueInTimeZone,
  getDateTimeInTimeZone,
  getTimeInputValueInTimeZone,
  parseDateKey,
  toDateKey,
  type CalendarDate,
  type CalendarTime,
} from './calendarDateUtils';
import type { CalendarEvent } from './calendarTypes';

export const recurrenceFrequencies = ['daily', 'weekly', 'monthly'] as const;

export type RecurrenceFrequency = (typeof recurrenceFrequencies)[number];
export type RecurrenceFormFrequency = 'none' | RecurrenceFrequency;

export type CalendarRecurrence = {
  frequency: RecurrenceFrequency;
  interval: 1;
  until: string | null;
};

export type RecurrenceFormValues = {
  frequency: RecurrenceFormFrequency;
  untilDate: string;
};

const rruleUntilPattern = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;
const maxExpandedOccurrences = 1000;

function isRecurrenceFrequency(value: string): value is RecurrenceFrequency {
  return recurrenceFrequencies.includes(value.toLowerCase() as RecurrenceFrequency);
}

function dateToUtcNoonMs(date: CalendarDate) {
  return Date.UTC(date.year, date.month - 1, date.day, 12);
}

function differenceInCalendarDays(left: CalendarDate, right: CalendarDate) {
  const msPerDay = 24 * 60 * 60 * 1000;

  return Math.round((dateToUtcNoonMs(left) - dateToUtcNoonMs(right)) / msPerDay);
}

function differenceInCalendarMonths(left: CalendarDate, right: CalendarDate) {
  return (left.year - right.year) * 12 + (left.month - right.month);
}

function parseRRuleUntil(value: string) {
  const match = rruleUntilPattern.exec(value);

  if (!match) {
    return null;
  }

  const [, year = '', month = '', day = '', hour = '', minute = '', second = ''] = match;
  const date = new Date(
    Date.UTC(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10),
      Number.parseInt(hour, 10),
      Number.parseInt(minute, 10),
      Number.parseInt(second, 10),
    ),
  );

  if (
    date.getUTCFullYear() !== Number.parseInt(year, 10) ||
    date.getUTCMonth() + 1 !== Number.parseInt(month, 10) ||
    date.getUTCDate() !== Number.parseInt(day, 10) ||
    date.getUTCHours() !== Number.parseInt(hour, 10) ||
    date.getUTCMinutes() !== Number.parseInt(minute, 10) ||
    date.getUTCSeconds() !== Number.parseInt(second, 10)
  ) {
    return null;
  }

  return date.toISOString();
}

function formatRRuleUntil(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function getDateTimeValueInTimeZone(value: string, timeZone: string): CalendarTime {
  const timeValue = getTimeInputValueInTimeZone(value, timeZone);
  const [hour = '0', minute = '0'] = timeValue.split(':');

  return {
    hour: Number.parseInt(hour, 10),
    minute: Number.parseInt(minute, 10),
  };
}

function addFrequency(anchor: CalendarDate, frequency: RecurrenceFrequency, index: number) {
  if (frequency === 'daily') {
    return addCalendarDays(anchor, index);
  }

  if (frequency === 'weekly') {
    return addCalendarDays(anchor, index * 7);
  }

  return addCalendarMonths(anchor, index);
}

function getFirstCandidateIndex({
  anchorDate,
  frequency,
  rangeStartDate,
}: {
  anchorDate: CalendarDate;
  frequency: RecurrenceFrequency;
  rangeStartDate: CalendarDate;
}) {
  if (frequency === 'daily') {
    return Math.max(0, differenceInCalendarDays(rangeStartDate, anchorDate) - 1);
  }

  if (frequency === 'weekly') {
    return Math.max(0, Math.floor(differenceInCalendarDays(rangeStartDate, anchorDate) / 7) - 1);
  }

  return Math.max(0, differenceInCalendarMonths(rangeStartDate, anchorDate) - 1);
}

function eventOverlapsRange(event: Pick<CalendarEvent, 'endsAt' | 'startsAt'>, range: DateRange) {
  return (
    new Date(event.startsAt).getTime() < range.rangeEnd.getTime() &&
    new Date(event.endsAt).getTime() > range.rangeStart.getTime()
  );
}

function createOccurrenceId(seriesId: string, startsAt: string) {
  return `${seriesId}__${startsAt.replace(/\D/g, '')}`;
}

type DateRange = {
  rangeEnd: Date;
  rangeStart: Date;
};

export function parseRecurrenceRule(rule: string | null | undefined): CalendarRecurrence | null {
  if (!rule) {
    return null;
  }

  const fields = new Map<string, string>();

  for (const part of rule.split(';')) {
    const [rawKey = '', rawValue = ''] = part.split('=');
    const key = rawKey.trim().toUpperCase();
    const value = rawValue.trim().toUpperCase();

    if (!key || !value || fields.has(key)) {
      return null;
    }

    fields.set(key, value);
  }

  const unsupportedKeys = [...fields.keys()].filter(
    (key) => key !== 'FREQ' && key !== 'INTERVAL' && key !== 'UNTIL',
  );
  const frequency = fields.get('FREQ')?.toLowerCase() ?? '';
  const interval = fields.get('INTERVAL') ?? '1';
  const untilValue = fields.get('UNTIL');

  if (unsupportedKeys.length > 0 || !isRecurrenceFrequency(frequency) || interval !== '1') {
    return null;
  }

  const until = untilValue ? parseRRuleUntil(untilValue) : null;

  if (untilValue && !until) {
    return null;
  }

  return {
    frequency,
    interval: 1,
    until,
  };
}

export function isSupportedRecurrenceRule(rule: string | null | undefined) {
  return rule == null || parseRecurrenceRule(rule) !== null;
}

export function buildRecurrenceRule({
  frequency,
  until,
}: {
  frequency: RecurrenceFormFrequency;
  until: string | null;
}) {
  if (frequency === 'none') {
    return null;
  }

  const parts = [`FREQ=${frequency.toUpperCase()}`, 'INTERVAL=1'];
  const formattedUntil = until ? formatRRuleUntil(until) : null;

  if (until && !formattedUntil) {
    return null;
  }

  if (formattedUntil) {
    parts.push(`UNTIL=${formattedUntil}`);
  }

  return parts.join(';');
}

export function getRecurrenceFormValues({
  recurrenceEndsAt,
  recurrenceRule,
  timeZone,
}: {
  recurrenceEndsAt: string | null;
  recurrenceRule: string | null;
  timeZone: string;
}): RecurrenceFormValues {
  const recurrence = parseRecurrenceRule(recurrenceRule);

  if (!recurrence) {
    return {
      frequency: 'none',
      untilDate: '',
    };
  }

  return {
    frequency: recurrence.frequency,
    untilDate: recurrenceEndsAt ? getDateInputValueInTimeZone(recurrenceEndsAt, timeZone) : '',
  };
}

export function getRecurrenceLabel(
  event: Pick<CalendarEvent, 'recurrenceEndsAt' | 'recurrenceRule' | 'timeZone'>,
) {
  const recurrence = parseRecurrenceRule(event.recurrenceRule);

  if (!recurrence) {
    return 'Does not repeat';
  }

  const labelByFrequency: Record<RecurrenceFrequency, string> = {
    daily: 'Repeats daily',
    monthly: 'Repeats monthly',
    weekly: 'Repeats weekly',
  };

  return event.recurrenceEndsAt
    ? `${labelByFrequency[recurrence.frequency]} until ${new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeZone: event.timeZone,
      }).format(new Date(event.recurrenceEndsAt))}`
    : labelByFrequency[recurrence.frequency];
}

export function expandRecurringEventsForRange({
  events,
  rangeEnd,
  rangeStart,
}: {
  events: CalendarEvent[];
  rangeEnd: string;
  rangeStart: string;
}) {
  const range = {
    rangeEnd: new Date(rangeEnd),
    rangeStart: new Date(rangeStart),
  };

  if (Number.isNaN(range.rangeStart.getTime()) || Number.isNaN(range.rangeEnd.getTime())) {
    return [];
  }

  const expandedEvents: CalendarEvent[] = [];

  for (const event of events) {
    const recurrence = parseRecurrenceRule(event.recurrenceRule);

    if (!recurrence) {
      if (eventOverlapsRange(event, range)) {
        expandedEvents.push(event);
      }

      continue;
    }

    const timeZone = event.timeZone;
    const anchorStartDate = getCalendarDateInTimeZone(new Date(event.startsAt), timeZone);
    const rangeStartDate = getCalendarDateInTimeZone(range.rangeStart, timeZone);
    const startIndex = getFirstCandidateIndex({
      anchorDate: anchorStartDate,
      frequency: recurrence.frequency,
      rangeStartDate,
    });
    const startTime = event.isAllDay
      ? { hour: 0, minute: 0 }
      : getDateTimeValueInTimeZone(event.startsAt, timeZone);
    const anchorEndDate = getCalendarDateInTimeZone(new Date(event.endsAt), timeZone);
    const endTime = event.isAllDay
      ? { hour: 0, minute: 0 }
      : getDateTimeValueInTimeZone(event.endsAt, timeZone);
    const endDayOffset = differenceInCalendarDays(anchorEndDate, anchorStartDate);
    const untilTime = recurrence.until ? new Date(recurrence.until).getTime() : null;
    let generated = 0;

    for (let index = startIndex; generated < maxExpandedOccurrences; index += 1) {
      const occurrenceStartDate = addFrequency(anchorStartDate, recurrence.frequency, index);
      const occurrenceEndDate = addCalendarDays(occurrenceStartDate, endDayOffset);
      const occurrenceStartsAt = (
        event.isAllDay
          ? getDateTimeInTimeZone(occurrenceStartDate, { hour: 0, minute: 0 }, timeZone)
          : getDateTimeInTimeZone(occurrenceStartDate, startTime, timeZone)
      ).toISOString();
      const occurrenceEndsAt = (
        event.isAllDay
          ? getDateTimeInTimeZone(occurrenceEndDate, { hour: 0, minute: 0 }, timeZone)
          : getDateTimeInTimeZone(occurrenceEndDate, endTime, timeZone)
      ).toISOString();
      const occurrenceStartTime = new Date(occurrenceStartsAt).getTime();

      if (untilTime !== null && occurrenceStartTime > untilTime) {
        break;
      }

      if (
        new Date(occurrenceStartsAt).getTime() >= range.rangeEnd.getTime() &&
        new Date(occurrenceEndsAt).getTime() >= range.rangeEnd.getTime()
      ) {
        break;
      }

      if (eventOverlapsRange({ endsAt: occurrenceEndsAt, startsAt: occurrenceStartsAt }, range)) {
        expandedEvents.push({
          ...event,
          baseEndsAt: event.baseEndsAt ?? event.endsAt,
          baseStartsAt: event.baseStartsAt ?? event.startsAt,
          endsAt: occurrenceEndsAt,
          id: createOccurrenceId(event.seriesId ?? event.id, occurrenceStartsAt),
          isGeneratedOccurrence: true,
          occurrenceStartsAt,
          seriesId: event.seriesId ?? event.id,
          startsAt: occurrenceStartsAt,
        });
      }

      generated += 1;
    }
  }

  return expandedEvents.sort((left, right) => {
    const startDifference = new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();

    if (startDifference !== 0) {
      return startDifference;
    }

    return left.title.localeCompare(right.title);
  });
}

export function getRecurrenceUntilDateEnd({
  dateKey,
  timeZone,
}: {
  dateKey: string;
  timeZone: string;
}) {
  return getDateTimeInTimeZone(parseDateKey(dateKey), { hour: 23, minute: 59 }, timeZone);
}

export function isRecurrenceEndBeforeStart({
  recurrenceEndDate,
  startDate,
}: {
  recurrenceEndDate: string;
  startDate: string;
}) {
  return compareCalendarDates(parseDateKey(recurrenceEndDate), parseDateKey(startDate)) < 0;
}

export function getOccurrenceSeriesStart(event: CalendarEvent) {
  return event.baseStartsAt ?? event.startsAt;
}

export function getOccurrenceSeriesEnd(event: CalendarEvent) {
  return event.baseEndsAt ?? event.endsAt;
}

export function getOccurrenceSeriesId(event: CalendarEvent) {
  return event.seriesId ?? event.id;
}

export function getRecurrenceSummaryForForm(frequency: RecurrenceFormFrequency) {
  const labels: Record<RecurrenceFormFrequency, string> = {
    daily: 'Daily',
    monthly: 'Monthly',
    none: 'Does not repeat',
    weekly: 'Weekly',
  };

  return labels[frequency];
}

export function getCalendarDateKeyForRecurrenceUntil(until: string | null, timeZone: string) {
  return until ? toDateKey(getCalendarDateInTimeZone(new Date(until), timeZone)) : '';
}
