import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CoupleMember, CoupleRelationship } from '../couples/coupleTypes';
import { SharedCalendar } from './SharedCalendar';
import type {
  CalendarEvent,
  CalendarEventCreateInput,
  CalendarEventDeleteInput,
  CalendarEventSearchQuery,
  CalendarEventUpdateInput,
  CalendarRepository,
} from './calendarTypes';

const alexMember = {
  activeMemberSlot: 1,
  displayName: 'Alex',
  id: 'member-1',
  joinedAt: '2026-08-08T12:00:00.000Z',
  userId: 'user-1',
} satisfies CoupleMember;

const jordanMember = {
  activeMemberSlot: 2,
  displayName: 'Jordan',
  id: 'member-2',
  joinedAt: '2026-08-08T12:05:00.000Z',
  userId: 'user-2',
} satisfies CoupleMember;

const relationship = {
  couple: {
    createdAt: '2026-08-08T12:00:00.000Z',
    createdBy: 'user-1',
    id: 'couple-1',
    name: 'Alex and Jordan',
    updatedAt: '2026-08-08T12:00:00.000Z',
  },
  kind: 'established',
  members: [alexMember, jordanMember],
} satisfies CoupleRelationship;

function createEvent(
  input: Partial<CalendarEvent> & Pick<CalendarEvent, 'endsAt' | 'startsAt' | 'title'>,
): CalendarEvent {
  return {
    category: input.category ?? 'personal',
    coupleId: input.coupleId ?? 'couple-1',
    createdAt: input.createdAt ?? '2026-08-01T00:00:00.000Z',
    createdBy: input.createdBy ?? 'user-1',
    creatorDisplayName: input.creatorDisplayName ?? 'Alex',
    description: input.description ?? null,
    endsAt: input.endsAt,
    id: input.id ?? input.title,
    isAllDay: input.isAllDay ?? false,
    location: input.location ?? null,
    recurrenceEndsAt: input.recurrenceEndsAt ?? null,
    recurrenceRule: input.recurrenceRule ?? null,
    startsAt: input.startsAt,
    timeZone: input.timeZone ?? 'America/Chicago',
    title: input.title,
    updatedAt: input.updatedAt ?? '2026-08-01T00:00:00.000Z',
    updatedBy: input.updatedBy ?? null,
    version: input.version ?? 1,
  };
}

function createCalendarRepository(events: CalendarEvent[] = []): CalendarRepository {
  let storedEvents = [...events];

  return {
    createEvent: vi.fn((input: CalendarEventCreateInput) => {
      const event = createEvent({
        ...input,
        createdAt: '2026-08-12T16:00:00.000Z',
        creatorDisplayName: 'Alex',
        id: 'created-event',
        updatedAt: '2026-08-12T16:00:00.000Z',
        updatedBy: null,
        version: 1,
      });

      storedEvents = [...storedEvents, event];

      return Promise.resolve(event);
    }),
    deleteEvent: vi.fn(({ eventId }: CalendarEventDeleteInput) => {
      storedEvents = storedEvents.filter(
        (event) => event.id !== eventId && event.seriesId !== eventId,
      );

      return Promise.resolve();
    }),
    listEventsForCouple: vi.fn(() => Promise.resolve(storedEvents)),
    searchEventsForCouple: vi.fn(({ categories, query }: CalendarEventSearchQuery) => {
      const normalizedQuery = query.trim().toLowerCase();

      return Promise.resolve(
        storedEvents.filter((event) => {
          const matchesCategory = categories.length === 0 || categories.includes(event.category);
          const matchesQuery =
            normalizedQuery.length === 0 ||
            [event.title, event.description, event.location, event.category]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(normalizedQuery);

          return matchesCategory && matchesQuery;
        }),
      );
    }),
    updateEvent: vi.fn((input: CalendarEventUpdateInput) => {
      const event = createEvent({
        ...input,
        id: input.eventId,
        updatedAt: '2026-08-12T16:30:00.000Z',
        updatedBy: 'user-1',
        version: input.expectedVersion + 1,
      });

      storedEvents = storedEvents.map((candidate) =>
        candidate.id === input.eventId ? event : candidate,
      );

      return Promise.resolve(event);
    }),
  };
}

function renderCalendar(
  repository: CalendarRepository,
  now = new Date('2026-08-12T15:00:00.000Z'),
) {
  return render(
    <SharedCalendar
      currentUserId="user-1"
      now={now}
      relationship={relationship}
      repository={repository}
      timeZone="America/Chicago"
    />,
  );
}

describe('SharedCalendar', () => {
  it('renders the current month and an intentional zero-event state', async () => {
    const repository = createCalendarRepository();

    renderCalendar(repository);

    expect(screen.getByText('August 2026')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Wednesday, August 12, 2026, today, selected/,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText('No shared events yet')).toBeInTheDocument();
    expect(screen.getByText('No events for this day')).toBeInTheDocument();
    expect(repository.listEventsForCouple).toHaveBeenCalledWith(
      expect.objectContaining({
        coupleId: 'couple-1',
        rangeEnd: '2026-09-07T05:00:00.000Z',
        rangeStart: '2026-07-27T05:00:00.000Z',
      }),
    );
  });

  it('supports month navigation and returning to today', async () => {
    const repository = createCalendarRepository();

    renderCalendar(repository);
    await screen.findByText('No shared events yet');

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));

    expect(await screen.findByText('September 2026')).toBeInTheDocument();
    expect(screen.getByText('Saturday, September 12, 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));

    expect(await screen.findByText('August 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    await screen.findByText('September 2026');
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));

    expect(await screen.findByText('August 2026')).toBeInTheDocument();
    expect(screen.getByText('Wednesday, August 12, 2026')).toBeInTheDocument();
  });

  it('shows selected-day events in agenda order with partner ownership labels', async () => {
    const repository = createCalendarRepository([
      createEvent({
        createdBy: 'user-2',
        creatorDisplayName: 'Jordan',
        endsAt: '2026-08-12T22:00:00.000Z',
        id: 'dinner',
        startsAt: '2026-08-12T21:00:00.000Z',
        title: 'Dinner',
      }),
      createEvent({
        endsAt: '2026-08-13T05:00:00.000Z',
        id: 'anniversary',
        isAllDay: true,
        startsAt: '2026-08-12T05:00:00.000Z',
        title: 'Anniversary',
      }),
      createEvent({
        endsAt: '2026-08-12T15:30:00.000Z',
        id: 'coffee',
        startsAt: '2026-08-12T15:00:00.000Z',
        title: 'Coffee',
      }),
    ]);

    renderCalendar(repository);

    const dayButton = await screen.findByRole('button', {
      name: /Wednesday, August 12, 2026, today, selected, 3 events/,
    });
    expect(dayButton).toBeInTheDocument();

    const eventList = screen.getByLabelText('Events for Wednesday, August 12, 2026');
    expect(
      within(eventList)
        .getAllByRole('heading', { level: 4 })
        .map((heading) => heading.textContent),
    ).toEqual(['Anniversary', 'Coffee', 'Dinner']);
    expect(within(eventList).getByText('Jordan')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Thursday, August 13, 2026/ }));

    expect(screen.getByText('No events for this day')).toBeInTheDocument();
  });

  it('shows a safe error state and retries loading', async () => {
    const repository = {
      ...createCalendarRepository(),
      listEventsForCouple: vi
        .fn()
        .mockRejectedValueOnce(new Error('permission denied for table calendar_events'))
        .mockResolvedValueOnce([]),
    } satisfies CalendarRepository;

    renderCalendar(repository);

    expect(
      await screen.findByText('The current session cannot access this shared calendar.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('No shared events yet')).toBeInTheDocument();
    expect(repository.listEventsForCouple).toHaveBeenCalledTimes(2);
  });

  it('creates an event from the calendar add action and refreshes the agenda', async () => {
    const repository = createCalendarRepository();

    renderCalendar(repository);
    await screen.findByText('No shared events yet');

    fireEvent.click(screen.getByRole('button', { name: 'Add event' }));
    await screen.findByRole('form', { name: 'Event form' });
    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: 'Movie night' },
    });
    fireEvent.change(screen.getByLabelText(/Location/), {
      target: { value: 'Cinema' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create event' }));

    expect(await screen.findByText('Event created.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Movie night' })).toBeInTheDocument();
    expect(repository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        coupleId: 'couple-1',
        createdBy: 'user-1',
        location: 'Cinema',
        title: 'Movie night',
      }),
    );
  });

  it('creates a categorized recurring event from the event form', async () => {
    const repository = createCalendarRepository();

    renderCalendar(repository);
    await screen.findByText('No shared events yet');

    fireEvent.click(screen.getByRole('button', { name: 'Add event' }));
    const form = await screen.findByRole('form', { name: 'Event form' });
    fireEvent.change(within(form).getByLabelText(/Title/), {
      target: { value: 'Weekly trip planning' },
    });
    fireEvent.change(within(form).getByLabelText(/Category/), {
      target: { value: 'travel' },
    });
    fireEvent.change(within(form).getByLabelText('Repeat'), {
      target: { value: 'weekly' },
    });
    fireEvent.change(within(form).getByLabelText('Repeat until'), {
      target: { value: '2026-08-26' },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Create event' }));

    await screen.findByText('Event created.');
    expect(repository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'travel',
        recurrenceEndsAt: '2026-08-27T04:59:00.000Z',
        recurrenceRule: 'FREQ=WEEKLY;INTERVAL=1;UNTIL=20260827T045900Z',
        title: 'Weekly trip planning',
      }),
    );
  });

  it('filters the visible agenda by category and returns series once in search results', async () => {
    const repository = createCalendarRepository([
      createEvent({
        category: 'date',
        endsAt: '2026-08-12T23:00:00.000Z',
        id: 'dinner',
        location: 'Downtown',
        startsAt: '2026-08-12T21:00:00.000Z',
        title: 'Dinner',
      }),
      createEvent({
        category: 'work',
        description: 'Budget review',
        endsAt: '2026-08-12T17:00:00.000Z',
        id: 'planning',
        recurrenceRule: 'FREQ=WEEKLY;INTERVAL=1',
        startsAt: '2026-08-12T16:00:00.000Z',
        title: 'Planning',
      }),
    ]);

    renderCalendar(repository);

    expect(await screen.findByRole('heading', { name: 'Dinner' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Planning' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Work' }));

    expect(await screen.findByText('1 matching series')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dinner' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Planning' })).toBeInTheDocument();
    expect(repository.searchEventsForCouple).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: ['work'],
        coupleId: 'couple-1',
      }),
    );

    fireEvent.change(screen.getByLabelText('Search events'), {
      target: { value: 'budget' },
    });

    const resultList = await screen.findByLabelText('Search results');
    expect(within(resultList).getAllByText('Planning')).toHaveLength(1);
  });

  it('opens event details and saves edits with the loaded event version', async () => {
    const repository = createCalendarRepository([
      createEvent({
        description: 'Reservation',
        endsAt: '2026-08-12T23:00:00.000Z',
        id: 'dinner',
        location: 'Old spot',
        startsAt: '2026-08-12T21:00:00.000Z',
        title: 'Dinner',
        version: 5,
      }),
    ]);

    renderCalendar(repository);

    fireEvent.click(await screen.findByRole('button', { name: /Open Dinner/ }));
    expect(screen.getAllByText('Old spot')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: 'Dinner updated' },
    });
    fireEvent.change(screen.getByLabelText(/Location/), {
      target: { value: 'New spot' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Event updated.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText('New spot')).toHaveLength(2);
    });
    expect(repository.updateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        coupleId: 'couple-1',
        eventId: 'dinner',
        expectedVersion: 5,
        location: 'New spot',
        title: 'Dinner updated',
      }),
    );
  });

  it('requires confirmation before deleting an event and removes it from the agenda', async () => {
    const repository = createCalendarRepository([
      createEvent({
        endsAt: '2026-08-12T23:00:00.000Z',
        id: 'dinner',
        startsAt: '2026-08-12T21:00:00.000Z',
        title: 'Dinner',
        version: 2,
      }),
    ]);

    renderCalendar(repository);

    fireEvent.click(await screen.findByRole('button', { name: /Open Dinner/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(repository.deleteEvent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete event' }));

    expect(await screen.findByText('Event deleted.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dinner' })).not.toBeInTheDocument();
    expect(repository.deleteEvent).toHaveBeenCalledWith({
      coupleId: 'couple-1',
      eventId: 'dinner',
      expectedVersion: 2,
    });
  });
});
