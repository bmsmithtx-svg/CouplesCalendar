export const calendarEventCategories = [
  {
    color: '#27645f',
    label: 'Personal',
    value: 'personal',
  },
  {
    color: '#315f8c',
    label: 'Work',
    value: 'work',
  },
  {
    color: '#9a5b24',
    label: 'Date',
    value: 'date',
  },
  {
    color: '#7b4f8f',
    label: 'Appointment',
    value: 'appointment',
  },
  {
    color: '#2f6f8f',
    label: 'Travel',
    value: 'travel',
  },
  {
    color: '#5f6f2f',
    label: 'Family',
    value: 'family',
  },
  {
    color: '#6b6258',
    label: 'Other',
    value: 'other',
  },
] as const;

export type CalendarEventCategory = (typeof calendarEventCategories)[number]['value'];

export const defaultCalendarEventCategory: CalendarEventCategory = 'personal';

const fallbackCalendarEventCategory = {
  color: '#27645f',
  label: 'Personal',
  value: defaultCalendarEventCategory,
} satisfies (typeof calendarEventCategories)[number];
const defaultCalendarEventCategoryDefinition =
  calendarEventCategories.find((category) => category.value === defaultCalendarEventCategory) ??
  fallbackCalendarEventCategory;
const categoryLabelsByValue = new Map(
  calendarEventCategories.map((category) => [category.value, category.label]),
);
const categoryColorsByValue = new Map(
  calendarEventCategories.map((category) => [category.value, category.color]),
);
const calendarEventCategoryValues = new Set<string>(
  calendarEventCategories.map((category) => category.value),
);

export function isCalendarEventCategory(value: string): value is CalendarEventCategory {
  return calendarEventCategoryValues.has(value);
}

export function normalizeCalendarEventCategory(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? '';

  return isCalendarEventCategory(normalized) ? normalized : defaultCalendarEventCategory;
}

export function getCalendarEventCategoryLabel(category: CalendarEventCategory) {
  return categoryLabelsByValue.get(category) ?? defaultCalendarEventCategoryDefinition.label;
}

export function getCalendarEventCategoryColor(category: CalendarEventCategory) {
  return categoryColorsByValue.get(category) ?? defaultCalendarEventCategoryDefinition.color;
}
