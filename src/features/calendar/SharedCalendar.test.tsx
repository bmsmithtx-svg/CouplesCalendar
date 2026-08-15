import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CoupleMember, CoupleRelationship } from '../couples/coupleTypes';
import { SharedCalendar } from './SharedCalendar';
import type { CalendarEvent, CalendarRepository } from './calendarTypes';

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
    coupleId: input.coupleId ?? 'couple-1',
    createdAt: input.createdAt ?? '2026-08-01T00:00:00.000Z',
    createdBy: input.createdBy ?? 'user-1',
    creatorDisplayName: input.creatorDisplayName ?? 'Alex',
    description: input.description ?? null,
    endsAt: input.endsAt,
    id: input.id ?? input.title,
    isAllDay: input.isAllDay ?? false,
    startsAt: input.startsAt,
    title: input.title,
    updatedAt: input.updatedAt ?? '2026-08-01T00:00:00.000Z',
  };
}

function renderCalendar(
  repository: CalendarRepository,
  now = new Date('2026-08-12T15:00:00.000Z'),
) {
  return render(
    <SharedCalendar
      now={now}
      relationship={relationship}
      repository={repository}
      timeZone="America/Chicago"
    />,
  );
}

describe('SharedCalendar', () => {
  it('renders the current month and an intentional zero-event state', async () => {
    const repository: CalendarRepository = {
      listEventsForCouple: vi.fn(() => Promise.resolve([])),
    };

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
    const repository: CalendarRepository = {
      listEventsForCouple: vi.fn(() => Promise.resolve([])),
    };

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
    const repository: CalendarRepository = {
      listEventsForCouple: vi.fn(() =>
        Promise.resolve([
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
        ]),
      ),
    };

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
    const repository: CalendarRepository = {
      listEventsForCouple: vi
        .fn()
        .mockRejectedValueOnce(new Error('permission denied for table calendar_events'))
        .mockResolvedValueOnce([]),
    };

    renderCalendar(repository);

    expect(
      await screen.findByText('The current session cannot access this shared calendar.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('No shared events yet')).toBeInTheDocument();
    expect(repository.listEventsForCouple).toHaveBeenCalledTimes(2);
  });
});
