export type CalendarEvent = {
  coupleId: string;
  createdAt: string;
  createdBy: string;
  creatorDisplayName: string | null;
  description: string | null;
  endsAt: string;
  id: string;
  isAllDay: boolean;
  startsAt: string;
  title: string;
  updatedAt: string;
};

export type CalendarEventsQuery = {
  coupleId: string;
  rangeEnd: string;
  rangeStart: string;
};

export type CalendarRepository = {
  listEventsForCouple: (query: CalendarEventsQuery) => Promise<CalendarEvent[]>;
};
