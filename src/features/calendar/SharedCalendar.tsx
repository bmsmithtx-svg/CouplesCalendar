import { useEffect, useMemo, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { EmptyState, LoadingIndicator, SkeletonStack } from '../../components/ui/LoadingStates';
import { StatusBanner } from '../../components/ui/StatusBanner';
import type { CoupleMember, CoupleRelationship } from '../couples/coupleTypes';
import { getSupabaseClientStatus } from '../../lib/supabase/client';
import { cx } from '../../lib/cx';
import {
  addCalendarMonths,
  buildMonthGrid,
  calendarWeekdayLabels,
  formatCalendarDate,
  formatEventTime,
  formatMonthHeading,
  getCalendarDateInTimeZone,
  getCalendarMonth,
  getVisibleGridUtcRange,
  groupEventsByDate,
  toDateKey,
  type CalendarDate,
} from './calendarDateUtils';
import { getSafeCalendarErrorMessage } from './calendarErrors';
import { createSupabaseCalendarRepository } from './calendarService';
import type { CalendarEvent, CalendarRepository } from './calendarTypes';

type EstablishedCoupleRelationship = Extract<CoupleRelationship, { kind: 'established' }>;

type CalendarRuntime =
  | {
      repository: CalendarRepository;
      status: 'ready';
    }
  | {
      message: string;
      status: 'missing';
    };

type CalendarLoadState =
  | {
      queryKey: string;
      status: 'loading';
    }
  | {
      events: CalendarEvent[];
      queryKey: string;
      status: 'ready';
    }
  | {
      message: string;
      queryKey: string;
      status: 'error';
    };

const emptyCalendarEvents: CalendarEvent[] = [];

function buildCalendarRuntime(repository: CalendarRepository | undefined): CalendarRuntime {
  if (repository) {
    return {
      repository,
      status: 'ready',
    };
  }

  const clientStatus = getSupabaseClientStatus();

  if (clientStatus.status === 'missing') {
    return {
      message: clientStatus.message,
      status: 'missing',
    };
  }

  return {
    repository: createSupabaseCalendarRepository(clientStatus.client),
    status: 'ready',
  };
}

function getMemberForEvent(event: CalendarEvent, members: CoupleMember[]) {
  return members.find((member) => member.userId === event.createdBy) ?? null;
}

function getOwnerSlot(event: CalendarEvent, members: CoupleMember[]) {
  return getMemberForEvent(event, members)?.activeMemberSlot ?? 'unknown';
}

function getOwnerLabel(event: CalendarEvent, members: CoupleMember[]) {
  const member = getMemberForEvent(event, members);

  return member?.displayName ?? event.creatorDisplayName ?? 'Couple member';
}

function getTodayDate(now: Date | undefined, timeZone: string) {
  return getCalendarDateInTimeZone(now ?? new Date(), timeZone);
}

function getDayButtonLabel({
  cell,
  events,
}: {
  cell: ReturnType<typeof buildMonthGrid>[number];
  events: CalendarEvent[];
}) {
  const parts = [formatCalendarDate(cell.date)];

  if (cell.isToday) {
    parts.push('today');
  }

  if (cell.isSelected) {
    parts.push('selected');
  }

  if (!cell.isCurrentMonth) {
    parts.push('outside current month');
  }

  if (events.length > 0) {
    parts.push(`${String(events.length)} ${events.length === 1 ? 'event' : 'events'}`);
  }

  return parts.join(', ');
}

function MemberLegend({ members }: { members: CoupleMember[] }) {
  return (
    <div className="cc-calendar-legend" aria-label="Calendar members">
      {members.map((member) => (
        <span
          className="cc-calendar-legend__item"
          data-owner-slot={member.activeMemberSlot}
          key={member.id}
        >
          <span className="cc-calendar-legend__swatch" aria-hidden="true" />
          {member.displayName ?? 'Couple member'}
        </span>
      ))}
    </div>
  );
}

function EventIndicators({
  events,
  members,
}: {
  events: CalendarEvent[];
  members: CoupleMember[];
}) {
  const ownerSlots = [...new Set(events.map((event) => getOwnerSlot(event, members)))].slice(0, 3);

  if (ownerSlots.length === 0) {
    return null;
  }

  return (
    <span className="cc-calendar-day__events" aria-hidden="true">
      {ownerSlots.map((ownerSlot) => (
        <span className="cc-calendar-day__event-dot" data-owner-slot={ownerSlot} key={ownerSlot} />
      ))}
    </span>
  );
}

function AgendaEvent({
  event,
  members,
  timeZone,
}: {
  event: CalendarEvent;
  members: CoupleMember[];
  timeZone: string;
}) {
  const ownerSlot = getOwnerSlot(event, members);

  return (
    <article className="cc-agenda-event" data-owner-slot={ownerSlot}>
      <div className="cc-agenda-event__time">{formatEventTime(event, timeZone)}</div>
      <div className="cc-agenda-event__body">
        <h4 className="cc-agenda-event__title">{event.title}</h4>
        <p className="cc-agenda-event__owner">{getOwnerLabel(event, members)}</p>
        {event.description ? (
          <p className="cc-agenda-event__description">{event.description}</p>
        ) : null}
      </div>
    </article>
  );
}

function AgendaSection({
  events,
  loadState,
  members,
  onRetry,
  selectedDate,
  timeZone,
}: {
  events: CalendarEvent[];
  loadState: CalendarLoadState;
  members: CoupleMember[];
  onRetry: () => void;
  selectedDate: CalendarDate;
  timeZone: string;
}) {
  const selectedDateLabel = formatCalendarDate(selectedDate);

  return (
    <section className="cc-calendar-agenda" aria-labelledby="selected-day-heading">
      <div className="cc-calendar-agenda__header">
        <h3 className="cc-calendar-agenda__title" id="selected-day-heading">
          {selectedDateLabel}
        </h3>
        <p className="cc-calendar-agenda__meta">Timezone: {timeZone}</p>
      </div>

      {loadState.status === 'loading' ? (
        <div className="cc-calendar-state">
          <LoadingIndicator label="Loading shared events" />
          <SkeletonStack count={2} label="Shared events loading placeholder" />
        </div>
      ) : null}

      {loadState.status === 'error' ? (
        <StatusBanner
          action={
            <Button onClick={onRetry} variant="secondary">
              Retry
            </Button>
          }
          title="Calendar unavailable"
          tone="error"
        >
          <p>{loadState.message}</p>
        </StatusBanner>
      ) : null}

      {loadState.status === 'ready' && events.length === 0 ? (
        <EmptyState title="No events for this day">
          <p>Shared events will appear here once they are added.</p>
        </EmptyState>
      ) : null}

      {loadState.status === 'ready' && events.length > 0 ? (
        <div className="cc-agenda-event-list" aria-label={`Events for ${selectedDateLabel}`}>
          {events.map((event) => (
            <AgendaEvent event={event} key={event.id} members={members} timeZone={timeZone} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function SharedCalendar({
  now,
  relationship,
  repository,
  timeZone,
}: {
  now?: Date | undefined;
  relationship: EstablishedCoupleRelationship;
  repository?: CalendarRepository | undefined;
  timeZone: string;
}) {
  const today = useMemo(() => getTodayDate(now, timeZone), [now, timeZone]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(() => getCalendarMonth(today));
  const [retryToken, setRetryToken] = useState(0);
  const runtime = useMemo(() => buildCalendarRuntime(repository), [repository]);

  const cells = useMemo(
    () =>
      buildMonthGrid({
        month: visibleMonth,
        selectedDate,
        today,
      }),
    [selectedDate, today, visibleMonth],
  );
  const queryCells = useMemo(
    () =>
      buildMonthGrid({
        month: visibleMonth,
        selectedDate: today,
        today,
      }),
    [today, visibleMonth],
  );
  const queryRange = useMemo(
    () => getVisibleGridUtcRange(queryCells, timeZone),
    [queryCells, timeZone],
  );
  const queryKey = useMemo(
    () =>
      runtime.status === 'ready'
        ? [
            relationship.couple.id,
            queryRange.rangeStart,
            queryRange.rangeEnd,
            String(retryToken),
          ].join('|')
        : `missing|${runtime.message}`,
    [queryRange.rangeEnd, queryRange.rangeStart, relationship.couple.id, retryToken, runtime],
  );
  const [loadState, setLoadState] = useState<CalendarLoadState>({
    queryKey: '',
    status: 'loading',
  });
  const activeLoadState: CalendarLoadState =
    runtime.status === 'missing'
      ? {
          message: runtime.message,
          queryKey,
          status: 'error',
        }
      : loadState.queryKey === queryKey
        ? loadState
        : {
            queryKey,
            status: 'loading',
          };

  useEffect(() => {
    if (runtime.status === 'missing') {
      return;
    }

    let isCurrent = true;
    const activeQueryKey = queryKey;

    runtime.repository
      .listEventsForCouple({
        coupleId: relationship.couple.id,
        rangeEnd: queryRange.rangeEnd,
        rangeStart: queryRange.rangeStart,
      })
      .then((events) => {
        if (isCurrent) {
          setLoadState({
            events,
            queryKey: activeQueryKey,
            status: 'ready',
          });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setLoadState({
            message: getSafeCalendarErrorMessage(error),
            queryKey: activeQueryKey,
            status: 'error',
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [queryKey, queryRange, relationship.couple.id, runtime]);

  const events = activeLoadState.status === 'ready' ? activeLoadState.events : emptyCalendarEvents;
  const eventsByDate = useMemo(() => groupEventsByDate(events, timeZone), [events, timeZone]);
  const selectedEvents = eventsByDate.get(toDateKey(selectedDate)) ?? [];
  const heading = formatMonthHeading(visibleMonth);

  function moveSelectedMonth(months: number) {
    const nextSelectedDate = addCalendarMonths(selectedDate, months);
    setSelectedDate(nextSelectedDate);
    setVisibleMonth(getCalendarMonth(nextSelectedDate));
  }

  function returnToToday() {
    const nextToday = getTodayDate(now, timeZone);
    setSelectedDate(nextToday);
    setVisibleMonth(getCalendarMonth(nextToday));
  }

  return (
    <div className="cc-shared-calendar">
      <div className="cc-calendar-summary">
        <div>
          <p className="cc-calendar-summary__label">Shared calendar</p>
          <p className="cc-calendar-summary__name">{relationship.couple.name}</p>
        </div>
        <MemberLegend members={relationship.members} />
      </div>

      <div className="cc-calendar-toolbar" aria-label="Calendar navigation">
        <Button
          aria-label="Previous month"
          onClick={() => {
            moveSelectedMonth(-1);
          }}
          variant="ghost"
        >
          Previous
        </Button>
        <div className="cc-calendar-toolbar__heading" aria-live="polite">
          {heading}
        </div>
        <Button
          aria-label="Next month"
          onClick={() => {
            moveSelectedMonth(1);
          }}
          variant="ghost"
        >
          Next
        </Button>
        <Button className="cc-calendar-toolbar__today" onClick={returnToToday} variant="secondary">
          Today
        </Button>
      </div>

      <div className="cc-calendar-weekdays" aria-hidden="true">
        {calendarWeekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="cc-calendar-grid" role="grid" aria-label={`${heading} calendar`}>
        {cells.map((cell) => {
          const dayEvents = eventsByDate.get(cell.key) ?? [];

          return (
            <button
              aria-current={cell.isToday ? 'date' : undefined}
              aria-label={getDayButtonLabel({ cell, events: dayEvents })}
              aria-pressed={cell.isSelected}
              className={cx(
                'cc-calendar-day',
                !cell.isCurrentMonth && 'cc-calendar-day--outside',
                cell.isToday && 'cc-calendar-day--today',
                cell.isSelected && 'cc-calendar-day--selected',
              )}
              key={cell.key}
              onClick={() => {
                setSelectedDate(cell.date);

                if (!cell.isCurrentMonth) {
                  setVisibleMonth(getCalendarMonth(cell.date));
                }
              }}
              type="button"
            >
              <span className="cc-calendar-day__number">{cell.date.day}</span>
              <EventIndicators events={dayEvents} members={relationship.members} />
            </button>
          );
        })}
      </div>

      {loadState.status === 'ready' && events.length === 0 ? (
        <EmptyState title="No shared events yet">
          <p>Shared events will appear on this calendar once events are added.</p>
        </EmptyState>
      ) : null}

      <AgendaSection
        events={selectedEvents}
        loadState={activeLoadState}
        members={relationship.members}
        onRetry={() => {
          setRetryToken((value) => value + 1);
        }}
        selectedDate={selectedDate}
        timeZone={timeZone}
      />
    </div>
  );
}
