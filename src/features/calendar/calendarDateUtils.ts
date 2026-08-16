import type { CalendarEvent } from './calendarTypes';

export const calendarWeekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export type CalendarDate = {
  day: number;
  month: number;
  year: number;
};

export type CalendarMonth = {
  month: number;
  year: number;
};

export type CalendarMonthCell = {
  date: CalendarDate;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  key: string;
};

type ZonedDateTimeParts = CalendarDate & {
  hour: number;
  minute: number;
  second: number;
};

type EventDateRange = Pick<CalendarEvent, 'endsAt' | 'startsAt'> &
  Partial<Pick<CalendarEvent, 'isAllDay' | 'timeZone'>>;
type SortableEvent = Pick<CalendarEvent, 'endsAt' | 'isAllDay' | 'startsAt' | 'title'>;

const zonedDateFormatters = new Map<string, Intl.DateTimeFormat>();

function getZonedDateFormatter(timeZone: string) {
  const existing = zonedDateFormatters.get(timeZone);

  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  });

  zonedDateFormatters.set(timeZone, formatter);

  return formatter;
}

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  const value = parts.find((part) => part.type === type)?.value;

  return value ? Number.parseInt(value, 10) : 0;
}

function getZonedDateTimeParts(date: Date, timeZone: string): ZonedDateTimeParts {
  const parts = getZonedDateFormatter(timeZone).formatToParts(date);

  return {
    day: readPart(parts, 'day'),
    hour: readPart(parts, 'hour'),
    minute: readPart(parts, 'minute'),
    month: readPart(parts, 'month'),
    second: readPart(parts, 'second'),
    year: readPart(parts, 'year'),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getZonedDateTimeParts(date, timeZone);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return localAsUtc - date.getTime();
}

function zonedDateTimeToUtc(parts: ZonedDateTimeParts, timeZone: string) {
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  let utcTime = localAsUtc - getTimeZoneOffsetMs(new Date(localAsUtc), timeZone);
  const recalculatedUtcTime = localAsUtc - getTimeZoneOffsetMs(new Date(utcTime), timeZone);

  if (recalculatedUtcTime !== utcTime) {
    utcTime = recalculatedUtcTime;
  }

  return new Date(utcTime);
}

export type CalendarTime = {
  hour: number;
  minute: number;
};

export function toDateKey(date: CalendarDate) {
  return `${String(date.year)}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(
    2,
    '0',
  )}`;
}

export function parseDateKey(key: string): CalendarDate {
  const [year = '0', month = '0', day = '0'] = key.split('-');

  return {
    day: Number.parseInt(day, 10),
    month: Number.parseInt(month, 10),
    year: Number.parseInt(year, 10),
  };
}

export function compareCalendarDates(left: CalendarDate, right: CalendarDate) {
  return toDateKey(left).localeCompare(toDateKey(right));
}

export function getCalendarMonth(date: CalendarDate): CalendarMonth {
  return {
    month: date.month,
    year: date.year,
  };
}

export function getCalendarDateInTimeZone(value: Date, timeZone: string): CalendarDate {
  const parts = getZonedDateTimeParts(value, timeZone);

  return {
    day: parts.day,
    month: parts.month,
    year: parts.year,
  };
}

export function getDaysInMonth(month: CalendarMonth) {
  return new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
}

export function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const result = new Date(Date.UTC(date.year, date.month - 1, date.day + days, 12));

  return {
    day: result.getUTCDate(),
    month: result.getUTCMonth() + 1,
    year: result.getUTCFullYear(),
  };
}

export function addCalendarMonths(date: CalendarDate, months: number): CalendarDate {
  const targetMonthIndex = date.month - 1 + months;
  const targetMonthStart = new Date(Date.UTC(date.year, targetMonthIndex, 1, 12));
  const targetMonth = {
    month: targetMonthStart.getUTCMonth() + 1,
    year: targetMonthStart.getUTCFullYear(),
  };
  const targetDay = Math.min(date.day, getDaysInMonth(targetMonth));

  return {
    ...targetMonth,
    day: targetDay,
  };
}

export function buildMonthGrid({
  month,
  selectedDate,
  today,
}: {
  month: CalendarMonth;
  selectedDate: CalendarDate;
  today: CalendarDate;
}): CalendarMonthCell[] {
  const firstOfMonth = new Date(Date.UTC(month.year, month.month - 1, 1, 12));
  const mondayBasedOffset = (firstOfMonth.getUTCDay() + 6) % 7;
  const gridStart = addCalendarDays(
    {
      day: 1,
      month: month.month,
      year: month.year,
    },
    -mondayBasedOffset,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = addCalendarDays(gridStart, index);

    return {
      date,
      isCurrentMonth: date.month === month.month && date.year === month.year,
      isSelected: compareCalendarDates(date, selectedDate) === 0,
      isToday: compareCalendarDates(date, today) === 0,
      key: toDateKey(date),
    };
  });
}

export function getDateStartInTimeZone(date: CalendarDate, timeZone: string) {
  return zonedDateTimeToUtc(
    {
      ...date,
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone,
  );
}

export function getDateTimeInTimeZone(date: CalendarDate, time: CalendarTime, timeZone: string) {
  return zonedDateTimeToUtc(
    {
      ...date,
      hour: time.hour,
      minute: time.minute,
      second: 0,
    },
    timeZone,
  );
}

export function getDateInputValueInTimeZone(value: string, timeZone: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return toDateKey(getCalendarDateInTimeZone(date, timeZone));
}

export function getTimeInputValueInTimeZone(value: string, timeZone: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const parts = getZonedDateTimeParts(date, timeZone);

  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

export function getInclusiveAllDayEndDateKey(event: Pick<CalendarEvent, 'endsAt' | 'timeZone'>) {
  const endsAt = new Date(event.endsAt);

  if (Number.isNaN(endsAt.getTime())) {
    return '';
  }

  return toDateKey(getCalendarDateInTimeZone(new Date(endsAt.getTime() - 1), event.timeZone));
}

export function getVisibleGridUtcRange(cells: CalendarMonthCell[], timeZone: string) {
  const firstCell = cells[0];
  const lastCell = cells.at(-1);

  if (!firstCell || !lastCell) {
    throw new Error('calendar_grid_empty');
  }

  return {
    rangeEnd: getDateStartInTimeZone(addCalendarDays(lastCell.date, 1), timeZone).toISOString(),
    rangeStart: getDateStartInTimeZone(firstCell.date, timeZone).toISOString(),
  };
}

export function getEventDateKeys(event: EventDateRange, timeZone: string) {
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return [];
  }

  const inclusiveEnd = new Date(Math.max(startsAt.getTime(), endsAt.getTime() - 1));
  const eventTimeZone =
    'isAllDay' in event &&
    event.isAllDay &&
    'timeZone' in event &&
    typeof event.timeZone === 'string'
      ? event.timeZone
      : timeZone;
  const startDate = getCalendarDateInTimeZone(startsAt, eventTimeZone);
  const endDate = getCalendarDateInTimeZone(inclusiveEnd, eventTimeZone);
  const keys: string[] = [];
  let cursor = startDate;

  while (compareCalendarDates(cursor, endDate) <= 0) {
    keys.push(toDateKey(cursor));
    cursor = addCalendarDays(cursor, 1);
  }

  return keys;
}

export function groupEventsByDate(events: CalendarEvent[], timeZone: string) {
  const eventsByDate = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    for (const key of getEventDateKeys(event, timeZone)) {
      const existing = eventsByDate.get(key);

      if (existing) {
        existing.push(event);
      } else {
        eventsByDate.set(key, [event]);
      }
    }
  }

  for (const [key, dayEvents] of eventsByDate) {
    eventsByDate.set(key, sortEventsForAgenda(dayEvents));
  }

  return eventsByDate;
}

export function sortEventsForAgenda<T extends SortableEvent>(events: T[]) {
  return [...events].sort((left, right) => {
    if (left.isAllDay !== right.isAllDay) {
      return left.isAllDay ? -1 : 1;
    }

    const startDifference = new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();

    if (startDifference !== 0) {
      return startDifference;
    }

    const endDifference = new Date(left.endsAt).getTime() - new Date(right.endsAt).getTime();

    if (endDifference !== 0) {
      return endDifference;
    }

    return left.title.localeCompare(right.title);
  });
}

export function formatCalendarDate(date: CalendarDate) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(date.year, date.month - 1, date.day, 12)));
}

export function formatMonthHeading(month: CalendarMonth) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(Date.UTC(month.year, month.month - 1, 1, 12)));
}

export function formatEventTime(
  event: Pick<CalendarEvent, 'endsAt' | 'isAllDay' | 'startsAt'>,
  timeZone: string,
) {
  if (event.isAllDay) {
    return 'All day';
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  });

  return `${formatter.format(new Date(event.startsAt))} - ${formatter.format(
    new Date(event.endsAt),
  )}`;
}
