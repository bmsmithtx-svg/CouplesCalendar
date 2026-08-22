import type { CalendarEventCategory } from './eventCategories';

export type CalendarEvent = {
  baseEndsAt?: string | undefined;
  baseStartsAt?: string | undefined;
  category: CalendarEventCategory;
  coupleId: string;
  createdAt: string;
  createdBy: string;
  creatorDisplayName: string | null;
  description: string | null;
  endsAt: string;
  id: string;
  isAllDay: boolean;
  isGeneratedOccurrence?: boolean | undefined;
  location: string | null;
  occurrenceStartsAt?: string | undefined;
  recurrenceEndsAt: string | null;
  recurrenceRule: string | null;
  seriesId?: string | undefined;
  startsAt: string;
  timeZone: string;
  title: string;
  updatedAt: string;
  updatedBy: string | null;
  version: number;
};

export type CalendarEventsQuery = {
  coupleId: string;
  rangeEnd: string;
  rangeStart: string;
};

export type CalendarEventSearchQuery = {
  categories: CalendarEventCategory[];
  coupleId: string;
  query: string;
};

export type CalendarEventWritable = {
  category: CalendarEventCategory;
  description: string | null;
  endsAt: string;
  isAllDay: boolean;
  location: string | null;
  recurrenceEndsAt: string | null;
  recurrenceRule: string | null;
  startsAt: string;
  timeZone: string;
  title: string;
};

export type CalendarEventCreateInput = CalendarEventWritable & {
  coupleId: string;
  createdBy: string;
};

export type CalendarEventUpdateInput = CalendarEventWritable & {
  coupleId: string;
  eventId: string;
  expectedVersion: number;
};

export type CalendarEventDeleteInput = {
  coupleId: string;
  eventId: string;
  expectedVersion: number;
};

export type CalendarRepository = {
  createEvent: (input: CalendarEventCreateInput) => Promise<CalendarEvent>;
  deleteEvent: (input: CalendarEventDeleteInput) => Promise<void>;
  listEventsForCouple: (query: CalendarEventsQuery) => Promise<CalendarEvent[]>;
  searchEventsForCouple: (query: CalendarEventSearchQuery) => Promise<CalendarEvent[]>;
  updateEvent: (input: CalendarEventUpdateInput) => Promise<CalendarEvent>;
};
