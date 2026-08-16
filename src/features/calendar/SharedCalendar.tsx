import { useEffect, useMemo, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState, LoadingIndicator, SkeletonStack } from '../../components/ui/LoadingStates';
import { Sheet } from '../../components/ui/Sheet';
import { StatusBanner } from '../../components/ui/StatusBanner';
import type { CoupleMember, CoupleRelationship } from '../couples/coupleTypes';
import { getSupabaseClientStatus } from '../../lib/supabase/client';
import { cx } from '../../lib/cx';
import { EditIcon, PlusIcon, TrashIcon } from '../../icons/AppIcons';
import {
  addCalendarMonths,
  buildMonthGrid,
  calendarWeekdayLabels,
  formatCalendarDate,
  formatEventTime,
  formatMonthHeading,
  getCalendarDateInTimeZone,
  getCalendarMonth,
  getDateInputValueInTimeZone,
  getInclusiveAllDayEndDateKey,
  getVisibleGridUtcRange,
  groupEventsByDate,
  parseDateKey,
  toDateKey,
  type CalendarDate,
} from './calendarDateUtils';
import { EventForm } from './EventForm';
import { getSafeCalendarErrorMessage } from './calendarErrors';
import { createSupabaseCalendarRepository } from './calendarService';
import type { CalendarEvent, CalendarEventWritable, CalendarRepository } from './calendarTypes';
import {
  getCalendarEventFormInputFromEvent,
  getDefaultCalendarEventFormInput,
} from './eventValidation';

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

type EventPanel =
  | {
      kind: 'create';
    }
  | {
      eventId: string;
      kind: 'details' | 'edit';
    };

type EventOperation = 'creating' | 'deleting' | 'idle' | 'updating';

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

function getEventDisplayDate(event: CalendarEvent, viewerTimeZone: string) {
  const timeZone = event.isAllDay ? event.timeZone : viewerTimeZone;
  const dateKey = getDateInputValueInTimeZone(event.startsAt, timeZone);

  return dateKey ? formatCalendarDate(parseDateKey(dateKey)) : 'Date unavailable';
}

function formatEventDetailTime(event: CalendarEvent, viewerTimeZone: string) {
  if (event.isAllDay) {
    const startDateKey = getDateInputValueInTimeZone(event.startsAt, event.timeZone);
    const endDateKey = getInclusiveAllDayEndDateKey(event);

    if (!startDateKey || !endDateKey) {
      return 'All day';
    }

    const startLabel = formatCalendarDate(parseDateKey(startDateKey));
    const endLabel = formatCalendarDate(parseDateKey(endDateKey));

    return startDateKey === endDateKey
      ? `${startLabel}, all day`
      : `${startLabel} - ${endLabel}, all day`;
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: viewerTimeZone,
  });

  return `${formatter.format(new Date(event.startsAt))} - ${formatter.format(
    new Date(event.endsAt),
  )}`;
}

function getEventSelectedDate(event: CalendarEvent, viewerTimeZone: string) {
  return getCalendarDateInTimeZone(
    new Date(event.startsAt),
    event.isAllDay ? event.timeZone : viewerTimeZone,
  );
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
  onOpen,
  timeZone,
}: {
  event: CalendarEvent;
  members: CoupleMember[];
  onOpen: (event: CalendarEvent) => void;
  timeZone: string;
}) {
  const ownerSlot = getOwnerSlot(event, members);

  return (
    <button
      aria-label={`Open ${event.title} on ${getEventDisplayDate(event, timeZone)}`}
      className="cc-agenda-event"
      data-owner-slot={ownerSlot}
      onClick={() => {
        onOpen(event);
      }}
      type="button"
    >
      <div className="cc-agenda-event__time">{formatEventTime(event, timeZone)}</div>
      <div className="cc-agenda-event__body">
        <h4 className="cc-agenda-event__title">{event.title}</h4>
        <p className="cc-agenda-event__owner">{getOwnerLabel(event, members)}</p>
        {event.location ? <p className="cc-agenda-event__location">{event.location}</p> : null}
        {event.description ? (
          <p className="cc-agenda-event__description">{event.description}</p>
        ) : null}
      </div>
    </button>
  );
}

function AgendaSection({
  events,
  loadState,
  members,
  onEventOpen,
  onRetry,
  selectedDate,
  timeZone,
}: {
  events: CalendarEvent[];
  loadState: CalendarLoadState;
  members: CoupleMember[];
  onEventOpen: (event: CalendarEvent) => void;
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
            <AgendaEvent
              event={event}
              key={event.id}
              members={members}
              onOpen={onEventOpen}
              timeZone={timeZone}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EventDetails({
  event,
  members,
  onDelete,
  onEdit,
  timeZone,
}: {
  event: CalendarEvent;
  members: CoupleMember[];
  onDelete: (event: CalendarEvent) => void;
  onEdit: (event: CalendarEvent) => void;
  timeZone: string;
}) {
  return (
    <div className="cc-event-details">
      <dl className="cc-event-details__list">
        <div>
          <dt>When</dt>
          <dd>{formatEventDetailTime(event, timeZone)}</dd>
        </div>
        <div>
          <dt>Timezone</dt>
          <dd>{event.timeZone}</dd>
        </div>
        <div>
          <dt>Created by</dt>
          <dd>{getOwnerLabel(event, members)}</dd>
        </div>
        {event.location ? (
          <div>
            <dt>Location</dt>
            <dd>{event.location}</dd>
          </div>
        ) : null}
        {event.description ? (
          <div>
            <dt>Notes</dt>
            <dd>{event.description}</dd>
          </div>
        ) : null}
      </dl>

      <div className="cc-event-details__actions">
        <Button
          onClick={() => {
            onEdit(event);
          }}
          variant="primary"
        >
          <EditIcon />
          Edit
        </Button>
        <Button
          onClick={() => {
            onDelete(event);
          }}
          variant="destructive"
        >
          <TrashIcon />
          Delete
        </Button>
      </div>
    </div>
  );
}

export function SharedCalendar({
  autoOpenCreate = false,
  currentUserId,
  now,
  onCreateClosed,
  relationship,
  repository,
  timeZone,
}: {
  autoOpenCreate?: boolean | undefined;
  currentUserId: string;
  now?: Date | undefined;
  onCreateClosed?: (() => void) | undefined;
  relationship: EstablishedCoupleRelationship;
  repository?: CalendarRepository | undefined;
  timeZone: string;
}) {
  const today = useMemo(() => getTodayDate(now, timeZone), [now, timeZone]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(() => getCalendarMonth(today));
  const [retryToken, setRetryToken] = useState(0);
  const [eventPanel, setEventPanel] = useState<EventPanel | null>(() =>
    autoOpenCreate ? { kind: 'create' } : null,
  );
  const [eventOperation, setEventOperation] = useState<EventOperation>('idle');
  const [eventError, setEventError] = useState<string | undefined>();
  const [eventNotice, setEventNotice] = useState<string | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);
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
  const activeEvent =
    eventPanel?.kind === 'details' || eventPanel?.kind === 'edit'
      ? (events.find((event) => event.id === eventPanel.eventId) ?? null)
      : null;
  const createFormInput = useMemo(
    () =>
      getDefaultCalendarEventFormInput({
        selectedDate,
        timeZone,
      }),
    [selectedDate, timeZone],
  );

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

  function refreshEvents() {
    setRetryToken((value) => value + 1);
  }

  function upsertLoadedEvent(event: CalendarEvent) {
    setLoadState((current) =>
      current.status === 'ready'
        ? {
            ...current,
            events: [...current.events.filter((candidate) => candidate.id !== event.id), event],
          }
        : current,
    );
  }

  function removeLoadedEvent(eventId: string) {
    setLoadState((current) =>
      current.status === 'ready'
        ? {
            ...current,
            events: current.events.filter((candidate) => candidate.id !== eventId),
          }
        : current,
    );
  }

  function selectEventDate(event: CalendarEvent) {
    const nextSelectedDate = getEventSelectedDate(event, timeZone);

    setSelectedDate(nextSelectedDate);
    setVisibleMonth(getCalendarMonth(nextSelectedDate));
  }

  function openCreatePanel() {
    setEventError(undefined);
    setEventNotice(undefined);
    setEventPanel({ kind: 'create' });
  }

  function closeEventPanel() {
    const wasCreatePanel = eventPanel?.kind === 'create';

    setEventPanel(null);
    setEventError(undefined);
    setDeleteTarget(null);

    if (wasCreatePanel) {
      onCreateClosed?.();
    }
  }

  async function handleCreateEvent(input: CalendarEventWritable) {
    if (runtime.status === 'missing') {
      setEventError(runtime.message);
      return;
    }

    setEventOperation('creating');
    setEventError(undefined);
    setEventNotice(undefined);

    try {
      const event = await runtime.repository.createEvent({
        ...input,
        coupleId: relationship.couple.id,
        createdBy: currentUserId,
      });

      upsertLoadedEvent(event);
      selectEventDate(event);
      refreshEvents();
      setEventPanel(null);
      onCreateClosed?.();
      setEventNotice('Event created.');
    } catch (error) {
      setEventError(getSafeCalendarErrorMessage(error));
    } finally {
      setEventOperation('idle');
    }
  }

  async function handleUpdateEvent(event: CalendarEvent, input: CalendarEventWritable) {
    if (runtime.status === 'missing') {
      setEventError(runtime.message);
      return;
    }

    setEventOperation('updating');
    setEventError(undefined);
    setEventNotice(undefined);

    try {
      const updatedEvent = await runtime.repository.updateEvent({
        ...input,
        coupleId: relationship.couple.id,
        eventId: event.id,
        expectedVersion: event.version,
      });

      upsertLoadedEvent(updatedEvent);
      selectEventDate(updatedEvent);
      refreshEvents();
      setEventPanel({ eventId: updatedEvent.id, kind: 'details' });
      setEventNotice('Event updated.');
    } catch (error) {
      setEventError(getSafeCalendarErrorMessage(error));
    } finally {
      setEventOperation('idle');
    }
  }

  async function handleDeleteEvent(event: CalendarEvent) {
    if (runtime.status === 'missing') {
      setEventError(runtime.message);
      return;
    }

    setEventOperation('deleting');
    setEventError(undefined);
    setEventNotice(undefined);

    try {
      await runtime.repository.deleteEvent({
        coupleId: relationship.couple.id,
        eventId: event.id,
        expectedVersion: event.version,
      });

      removeLoadedEvent(event.id);
      refreshEvents();
      setDeleteTarget(null);
      setEventPanel(null);
      setEventNotice('Event deleted.');
    } catch (error) {
      setEventError(getSafeCalendarErrorMessage(error));
    } finally {
      setEventOperation('idle');
    }
  }

  return (
    <div className="cc-shared-calendar">
      <div className="cc-calendar-summary">
        <div>
          <p className="cc-calendar-summary__label">Shared calendar</p>
          <p className="cc-calendar-summary__name">{relationship.couple.name}</p>
        </div>
        <div className="cc-calendar-summary__actions">
          <MemberLegend members={relationship.members} />
          <Button onClick={openCreatePanel} variant="primary">
            <PlusIcon />
            Add event
          </Button>
        </div>
      </div>

      {eventNotice ? (
        <StatusBanner title="Event saved" tone="success">
          <p>{eventNotice}</p>
        </StatusBanner>
      ) : null}

      {eventError ? (
        <StatusBanner title="Event action failed" tone="error">
          <p>{eventError}</p>
        </StatusBanner>
      ) : null}

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
        onEventOpen={(event) => {
          setEventError(undefined);
          setEventNotice(undefined);
          setEventPanel({ eventId: event.id, kind: 'details' });
        }}
        onRetry={() => {
          refreshEvents();
        }}
        selectedDate={selectedDate}
        timeZone={timeZone}
      />

      <Sheet
        closeLabel="Close event panel"
        onClose={closeEventPanel}
        open={eventPanel !== null}
        title={
          eventPanel?.kind === 'create'
            ? 'Create event'
            : eventPanel?.kind === 'edit'
              ? 'Edit event'
              : (activeEvent?.title ?? 'Event details')
        }
      >
        {eventPanel?.kind === 'create' ? (
          <EventForm
            defaultInput={createFormInput}
            error={eventError}
            isSaving={eventOperation === 'creating'}
            key={`create-${toDateKey(selectedDate)}`}
            onCancel={closeEventPanel}
            onSubmit={(input) => {
              void handleCreateEvent(input);
            }}
            submitLabel="Create event"
          />
        ) : null}

        {eventPanel?.kind === 'details' && activeEvent ? (
          <EventDetails
            event={activeEvent}
            members={relationship.members}
            onDelete={(event) => {
              setDeleteTarget(event);
            }}
            onEdit={(event) => {
              setEventError(undefined);
              setEventPanel({ eventId: event.id, kind: 'edit' });
            }}
            timeZone={timeZone}
          />
        ) : null}

        {eventPanel?.kind === 'edit' && activeEvent ? (
          <EventForm
            defaultInput={getCalendarEventFormInputFromEvent(activeEvent)}
            error={eventError}
            isSaving={eventOperation === 'updating'}
            key={`edit-${activeEvent.id}-${String(activeEvent.version)}`}
            onCancel={() => {
              setEventError(undefined);
              setEventPanel({ eventId: activeEvent.id, kind: 'details' });
            }}
            onSubmit={(input) => {
              void handleUpdateEvent(activeEvent, input);
            }}
            submitLabel="Save changes"
          />
        ) : null}

        {eventPanel && eventPanel.kind !== 'create' && !activeEvent ? (
          <EmptyState title="Event unavailable">
            <p>Refresh the shared calendar to load the latest event state.</p>
          </EmptyState>
        ) : null}
      </Sheet>

      <Dialog
        destructive
        footer={
          <>
            <Button
              onClick={() => {
                setDeleteTarget(null);
              }}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              isLoading={eventOperation === 'deleting'}
              onClick={() => {
                if (deleteTarget) {
                  void handleDeleteEvent(deleteTarget);
                }
              }}
              variant="destructive"
            >
              Delete event
            </Button>
          </>
        }
        onClose={() => {
          setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
        title="Delete event"
      >
        <p>This removes the event from the shared calendar for both members.</p>
      </Dialog>
    </div>
  );
}
