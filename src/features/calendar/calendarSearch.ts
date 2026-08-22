import { getCalendarEventCategoryLabel, type CalendarEventCategory } from './eventCategories';
import type { CalendarEvent } from './calendarTypes';

export type CalendarSearchFilters = {
  categories: CalendarEventCategory[];
  query: string;
};

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function getNormalizedSearchQuery(query: string) {
  return normalizeSearchValue(query);
}

export function hasActiveCalendarFilters(filters: CalendarSearchFilters) {
  return getNormalizedSearchQuery(filters.query).length > 0 || filters.categories.length > 0;
}

export function eventMatchesCalendarFilters(event: CalendarEvent, filters: CalendarSearchFilters) {
  if (filters.categories.length > 0 && !filters.categories.includes(event.category)) {
    return false;
  }

  const query = getNormalizedSearchQuery(filters.query);

  if (!query) {
    return true;
  }

  const searchableText = [
    event.title,
    event.description,
    event.location,
    getCalendarEventCategoryLabel(event.category),
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLocaleLowerCase();

  return searchableText.includes(query);
}

export function filterCalendarEvents(events: CalendarEvent[], filters: CalendarSearchFilters) {
  return events.filter((event) => eventMatchesCalendarFilters(event, filters));
}
