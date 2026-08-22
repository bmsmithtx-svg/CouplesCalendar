import { describe, expect, it } from 'vitest';

import {
  calendarEventCategories,
  defaultCalendarEventCategory,
  getCalendarEventCategoryLabel,
  isCalendarEventCategory,
  normalizeCalendarEventCategory,
} from './eventCategories';

describe('event categories', () => {
  it('centralizes the fixed supported category set', () => {
    expect(calendarEventCategories.map((category) => category.value)).toEqual([
      'personal',
      'work',
      'date',
      'appointment',
      'travel',
      'family',
      'other',
    ]);
    expect(defaultCalendarEventCategory).toBe('personal');
  });

  it('validates and normalizes category values for persistence mapping', () => {
    expect(isCalendarEventCategory('travel')).toBe(true);
    expect(isCalendarEventCategory('unknown')).toBe(false);
    expect(normalizeCalendarEventCategory(' WORK ')).toBe('work');
    expect(normalizeCalendarEventCategory(null)).toBe('personal');
    expect(getCalendarEventCategoryLabel('appointment')).toBe('Appointment');
  });
});
