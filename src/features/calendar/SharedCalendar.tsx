import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState, LoadingIndicator, SkeletonStack } from '../../components/ui/LoadingStates';
import { Sheet } from '../../components/ui/Sheet';
import { StatusBanner } from '../../components/ui/StatusBanner';
import type { CoupleMember, CoupleRelationship } from '../couples/coupleTypes';
import { getSupabaseClientStatus } from '../../lib/supabase/client';
import { cx } from '../../lib/cx';
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from '../../icons/AppIcons';
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
import { filterCalendarEvents, hasActiveCalendarFilters } from './calendarSearch';
import { createSupabaseCalendarRepository } from './calendarService';
import type { CalendarEvent, CalendarEventWritable, CalendarRepository } from './calendarTypes';
import {
  calendarEventCategories,
  getCalendarEventCategoryColor,
  getCalendarEventCategoryLabel,
  type CalendarEventCategory,
} from './eventCategories';
import { getOccurrenceSeriesId, getRecurrenceLabel } from './eventRecurrence';
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
      event: CalendarEvent;
      kind: 'details' | 'edit';
    };

type EventOperation = 'creating' | 'deleting' | 'idle' | 'updating';

type CalendarSearchLoadState =
  | {
      status: 'idle';
    }
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

function getCategoryStyle(category: CalendarEventCategory): CSSProperties {
  return {
    '--cc-category-color': getCalendarEventCategoryColor(category),
  } as CSSProperties;
}

function CategoryBadge({ category }: { category: CalendarEventCategory }) {
  return (
    <span className="cc-category-badge" style={getCategoryStyle(category)}>
      <span className="cc-category-badge__swatch" aria-hidden="true" />
      {getCalendarEventCategoryLabel(category)}
    </span>
  );
}

function isRecurringEvent(event: CalendarEvent) {
  return event.recurrenceRule !== null;
}

function getPanelEvent(snapshot: CalendarEvent, events: CalendarEvent[]) {
  return (
    events.find((event) => event.id === snapshot.id) ??
    events.find(
      (event) =>
        getOccurrenceSeriesId(event) === getOccurrenceSeriesId(snapshot) &&
        event.occurrenceStartsAt === snapshot.occurrenceStartsAt,
    ) ??
    snapshot
  );
}

function toggleCategoryFilter(
  categories: CalendarEventCategory[],
  category: CalendarEventCategory,
) {
  return categories.includes(category)
    ? categories.filter((candidate) => candidate !== category)
    : [...categories, category];
}

function getSearchStateResultCount(searchState: CalendarSearchLoadState) {
  return searchState.status === 'ready' ? searchState.events.length : 0;
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

function SearchAndFilterPanel({
  categoryFilters,
  onCategoryToggle,
  onClear,
  onQueryChange,
  onResultOpen,
  query,
  searchState,
}: {
  categoryFilters: CalendarEventCategory[];
  onCategoryToggle: (category: CalendarEventCategory) => void;
  onClear: () => void;
  onQueryChange: (query: string) => void;
  onResultOpen: (event: CalendarEvent) => void;
  query: string;
  searchState: CalendarSearchLoadState;
}) {
  const hasCriteria =
    query.trim().length > 0 || categoryFilters.length > 0 || searchState.status !== 'idle';
  const resultCount = getSearchStateResultCount(searchState);

  return (
    <section className="cc-calendar-search" aria-labelledby="calendar-search-heading">
      <div className="cc-calendar-search__header">
        <div>
          <h3 className="cc-calendar-search__title" id="calendar-search-heading">
            Search and filters
          </h3>
          <p className="cc-calendar-search__meta">
            {hasCriteria
              ? `${String(resultCount)} matching ${resultCount === 1 ? 'series' : 'series'}`
              : 'Search by event text or narrow the visible calendar by category.'}
          </p>
        </div>
        {hasCriteria ? (
          <Button onClick={onClear} variant="ghost">
            Clear
          </Button>
        ) : null}
      </div>

      <label className="cc-calendar-search__field">
        <span className="cc-field__label">
          <SearchIcon />
          Search events
        </span>
        <input
          className="cc-input"
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
          placeholder="Title, notes, location, or category"
          type="search"
          value={query}
        />
      </label>

      <div className="cc-category-filter" aria-label="Category filters">
        {calendarEventCategories.map((category) => {
          const isSelected = categoryFilters.includes(category.value);

          return (
            <button
              aria-pressed={isSelected}
              className="cc-category-filter__button"
              key={category.value}
              onClick={() => {
                onCategoryToggle(category.value);
              }}
              style={getCategoryStyle(category.value)}
              type="button"
            >
              <span className="cc-category-badge__swatch" aria-hidden="true" />
              {category.label}
            </button>
          );
        })}
      </div>

      {searchState.status === 'loading' ? <LoadingIndicator label="Searching events" /> : null}

      {searchState.status === 'error' ? (
        <StatusBanner title="Search unavailable" tone="error">
          <p>{searchState.message}</p>
        </StatusBanner>
      ) : null}

      {searchState.status === 'idle' ? (
        <EmptyState title="Search is ready">
          <p>Enter a query or choose a category to search active shared events.</p>
        </EmptyState>
      ) : null}

      {searchState.status === 'ready' && searchState.events.length === 0 ? (
        <EmptyState title="No matching events">
          <p>Clear search or category filters to return to the full shared calendar.</p>
        </EmptyState>
      ) : null}

      {searchState.status === 'ready' && searchState.events.length > 0 ? (
        <div className="cc-search-results" aria-label="Search results">
          {searchState.events.map((event) => (
            <button
              className="cc-search-result"
              key={event.id}
              onClick={() => {
                onResultOpen(event);
              }}
              type="button"
            >
              <div className="cc-search-result__body">
                <span className="cc-search-result__title">{event.title}</span>
                <span className="cc-search-result__meta">
                  {formatEventDetailTime(event, event.timeZone)}
                </span>
              </div>
              <CategoryBadge category={event.category} />
            </button>
          ))}
        </div>
      ) : null}
    </section>
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
        <div className="cc-agenda-event__meta">
          <CategoryBadge category={event.category} />
          {isRecurringEvent(event) ? <span>Repeating series</span> : null}
        </div>
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
  hasActiveFilters,
  loadState,
  members,
  onEventOpen,
  onRetry,
  selectedDate,
  timeZone,
}: {
  events: CalendarEvent[];
  hasActiveFilters: boolean;
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
        <EmptyState
          title={hasActiveFilters ? 'No matching events for this day' : 'No events for this day'}
        >
          <p>
            {hasActiveFilters
              ? 'Clear search or category filters to see all events for this date.'
              : 'Shared events will appear here once they are added.'}
          </p>
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
  const recurring = isRecurringEvent(event);

  return (
    <div className="cc-event-details">
      <dl className="cc-event-details__list">
        <div>
          <dt>When</dt>
          <dd>{formatEventDetailTime(event, timeZone)}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>
            <CategoryBadge category={event.category} />
          </dd>
        </div>
        <div>
          <dt>Repeat</dt>
          <dd>{getRecurrenceLabel(event)}</dd>
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
          {recurring ? 'Edit series' : 'Edit'}
        </Button>
        <Button
          onClick={() => {
            onDelete(event);
          }}
          variant="destructive"
        >
          <TrashIcon />
          {recurring ? 'Delete series' : 'Delete'}
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<CalendarEventCategory[]>([]);
  const [searchState, setSearchState] = useState<CalendarSearchLoadState>({ status: 'idle' });
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
  const searchFilters = useMemo(
    () => ({
      categories: selectedCategories,
      query: searchQuery,
    }),
    [searchQuery, selectedCategories],
  );
  const hasActiveFilters = hasActiveCalendarFilters(searchFilters);
  const searchQueryKey = useMemo(
    () => [relationship.couple.id, searchQuery.trim(), selectedCategories.join(',')].join('|'),
    [relationship.couple.id, searchQuery, selectedCategories],
  );
  const activeSearchState: CalendarSearchLoadState = !hasActiveFilters
    ? { status: 'idle' }
    : runtime.status === 'missing'
      ? {
          message: runtime.message,
          queryKey: 'missing',
          status: 'error',
        }
      : searchState.status !== 'idle' && searchState.queryKey === searchQueryKey
        ? searchState
        : {
            queryKey: searchQueryKey,
            status: 'loading',
          };
  const filteredEvents = useMemo(
    () => filterCalendarEvents(events, searchFilters),
    [events, searchFilters],
  );
  const eventsByDate = useMemo(
    () => groupEventsByDate(filteredEvents, timeZone),
    [filteredEvents, timeZone],
  );
  const selectedEvents = eventsByDate.get(toDateKey(selectedDate)) ?? [];
  const heading = formatMonthHeading(visibleMonth);
  const activeEvent =
    eventPanel?.kind === 'details' || eventPanel?.kind === 'edit'
      ? getPanelEvent(eventPanel.event, events)
      : null;
  const createFormInput = useMemo(
    () =>
      getDefaultCalendarEventFormInput({
        selectedDate,
        timeZone,
      }),
    [selectedDate, timeZone],
  );

  useEffect(() => {
    if (!hasActiveFilters || runtime.status === 'missing') {
      return;
    }

    let isCurrent = true;

    runtime.repository
      .searchEventsForCouple({
        categories: selectedCategories,
        coupleId: relationship.couple.id,
        query: searchQuery,
      })
      .then((searchEvents) => {
        if (isCurrent) {
          setSearchState({
            events: searchEvents,
            queryKey: searchQueryKey,
            status: 'ready',
          });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setSearchState({
            message: getSafeCalendarErrorMessage(error),
            queryKey: searchQueryKey,
            status: 'error',
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    hasActiveFilters,
    relationship.couple.id,
    runtime,
    searchQuery,
    searchQueryKey,
    selectedCategories,
  ]);

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
            events: current.events.filter(
              (candidate) =>
                candidate.id !== eventId && getOccurrenceSeriesId(candidate) !== eventId,
            ),
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

  function clearSearchAndFilters() {
    setSearchQuery('');
    setSelectedCategories([]);
    setSearchState({ status: 'idle' });
  }

  function openEventDetails(event: CalendarEvent) {
    setEventError(undefined);
    setEventNotice(undefined);
    setEventPanel({ event, kind: 'details' });
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
        eventId: getOccurrenceSeriesId(event),
        expectedVersion: event.version,
      });

      upsertLoadedEvent(updatedEvent);
      selectEventDate(updatedEvent);
      refreshEvents();
      setEventPanel({ event: updatedEvent, kind: 'details' });
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
        eventId: getOccurrenceSeriesId(event),
        expectedVersion: event.version,
      });

      removeLoadedEvent(getOccurrenceSeriesId(event));
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

      <SearchAndFilterPanel
        categoryFilters={selectedCategories}
        onCategoryToggle={(category) => {
          setSelectedCategories((current) => toggleCategoryFilter(current, category));
        }}
        onClear={clearSearchAndFilters}
        onQueryChange={setSearchQuery}
        onResultOpen={(event) => {
          selectEventDate(event);
          openEventDetails(event);
        }}
        query={searchQuery}
        searchState={activeSearchState}
      />

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
        hasActiveFilters={hasActiveFilters}
        events={selectedEvents}
        loadState={activeLoadState}
        members={relationship.members}
        onEventOpen={openEventDetails}
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
              ? activeEvent && isRecurringEvent(activeEvent)
                ? 'Edit series'
                : 'Edit event'
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
              setEventPanel({ event, kind: 'edit' });
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
              setEventPanel({ event: activeEvent, kind: 'details' });
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
              {deleteTarget && isRecurringEvent(deleteTarget) ? 'Delete series' : 'Delete event'}
            </Button>
          </>
        }
        onClose={() => {
          setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
        title={deleteTarget && isRecurringEvent(deleteTarget) ? 'Delete series' : 'Delete event'}
      >
        <p>
          {deleteTarget && isRecurringEvent(deleteTarget)
            ? 'This removes the repeating series from the shared calendar for both members.'
            : 'This removes the event from the shared calendar for both members.'}
        </p>
      </Dialog>
    </div>
  );
}
