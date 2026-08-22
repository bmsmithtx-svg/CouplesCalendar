export type DestinationId = 'calendar' | 'search' | 'add' | 'categories' | 'settings';

export type DestinationConfig = {
  id: DestinationId;
  label: string;
  desktopLabel?: string;
  heading: string;
  description: string;
};

export const destinationConfig: Record<DestinationId, DestinationConfig> = {
  calendar: {
    id: 'calendar',
    label: 'Calendar',
    heading: 'Calendar workspace',
    description: 'View the private shared calendar for your active couple workspace.',
  },
  search: {
    id: 'search',
    label: 'Search',
    desktopLabel: 'Search and filters',
    heading: 'Search and filters',
    description: 'Search active shared events and combine event text with category filters.',
  },
  add: {
    id: 'add',
    label: 'Add event',
    heading: 'Add event',
    description: 'Create a single event in the active shared calendar.',
  },
  categories: {
    id: 'categories',
    label: 'Categories',
    heading: 'Categories',
    description: 'Reference the supported event categories used by the shared calendar.',
  },
  settings: {
    id: 'settings',
    label: 'Settings',
    heading: 'Profile settings',
    description: 'Manage your profile, couple workspace, and current authentication session.',
  },
};

export const phoneNavigation = ['calendar', 'search', 'add', 'settings'] as const;

export const desktopNavigation = ['calendar', 'search', 'categories', 'settings'] as const;

export function getDestination(destinationId: DestinationId) {
  return destinationConfig[destinationId];
}
