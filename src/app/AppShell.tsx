import { useState } from 'react';

import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { SelectField, TextareaField, TextField } from '../components/ui/Fields';
import { EmptyState, LoadingIndicator, SkeletonStack } from '../components/ui/LoadingStates';
import { Sheet } from '../components/ui/Sheet';
import { StatusBanner } from '../components/ui/StatusBanner';
import { ContextPanel } from '../components/layout/ContextPanel';
import { BottomNavigation, SidebarNavigation } from '../components/layout/Navigation';
import { PageHeader } from '../components/layout/PageHeader';
import { Surface } from '../components/layout/Surface';
import { useAuth } from '../features/auth/AuthContext';
import type { CalendarRepository } from '../features/calendar/calendarTypes';
import {
  CoupleContextSummary,
  CoupleHome,
  CoupleSettings,
} from '../features/couples/CoupleWorkspace';
import { ProfileSettings } from '../features/profiles/ProfileSettings';
import { PlusIcon, SearchIcon } from '../icons/AppIcons';
import { projectMetadata } from '../lib/projectMetadata';
import {
  type DestinationId,
  desktopNavigation,
  getDestination,
  phoneNavigation,
} from './navigation';

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const fieldStateOptions = [
  { label: 'Information state', value: 'info' },
  { label: 'Success state', value: 'success' },
  { label: 'Warning state', value: 'warning' },
] as const;

export function AppShell({
  calendarRepository,
}: {
  calendarRepository?: CalendarRepository | undefined;
}) {
  const { signOut, state } = useAuth();
  const [activeDestination, setActiveDestination] = useState<DestinationId>('calendar');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const active = getDestination(activeDestination);

  if (state.status !== 'authenticated') {
    return null;
  }

  return (
    <div className="cc-app-shell">
      <SidebarNavigation
        activeDestination={activeDestination}
        items={desktopNavigation}
        label="Desktop primary navigation"
        onDestinationChange={setActiveDestination}
      />

      <div className="cc-app-shell__workspace">
        <PageHeader
          description={active.description}
          eyebrow={projectMetadata.phase}
          title={active.heading}
          actions={
            <>
              <span className="cc-account-chip" aria-label="Signed-in profile">
                {state.profile.displayName}
              </span>
              <Button
                onClick={() => {
                  setIsSheetOpen(true);
                }}
                variant="secondary"
              >
                Open sheet preview
              </Button>
              <Button
                onClick={() => {
                  void signOut();
                }}
                isLoading={state.operation === 'signing-out'}
                variant="ghost"
              >
                Sign out
              </Button>
            </>
          }
        />

        <main className="cc-main" aria-labelledby="shell-destination-title">
          <DestinationPreview
            activeDestination={activeDestination}
            calendarRepository={calendarRepository}
            onDialogOpen={() => {
              setIsDialogOpen(true);
            }}
            onSelectDestination={setActiveDestination}
            onSheetOpen={() => {
              setIsSheetOpen(true);
            }}
          />
        </main>
      </div>

      <ContextPanel title="Review context">
        <div className="cc-context-panel__stack">
          <StatusBanner title="Signed in" tone="success">
            {state.session.user.email ?? 'Supabase account'} is authenticated.
          </StatusBanner>
          <div className="cc-context-card">
            <p className="cc-context-card__label">Display name</p>
            <p className="cc-context-card__value">{state.profile.displayName}</p>
          </div>
          <div className="cc-context-card">
            <p className="cc-context-card__label">Default timezone</p>
            <p className="cc-context-card__text">{state.profile.defaultTimezone}</p>
          </div>
          <CoupleContextSummary />
        </div>
      </ContextPanel>

      <BottomNavigation
        activeDestination={activeDestination}
        items={phoneNavigation}
        label="Phone primary navigation"
        onDestinationChange={setActiveDestination}
      />

      <Dialog
        description="A reusable confirmation surface for later destructive states. This preview does not change data."
        destructive
        footer={
          <>
            <Button
              onClick={() => {
                setIsDialogOpen(false);
              }}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsDialogOpen(false);
              }}
              variant="destructive"
            >
              Close preview
            </Button>
          </>
        }
        onClose={() => {
          setIsDialogOpen(false);
        }}
        open={isDialogOpen}
        title="Destructive state preview"
      >
        <p>
          This dialog establishes accessible naming, Escape dismissal, focus return, and a
          destructive visual treatment without implementing a product workflow.
        </p>
      </Dialog>

      <Sheet
        description="A reusable drawer for future focused phone forms and desktop detail panels."
        footer={
          <Button
            onClick={() => {
              setIsSheetOpen(false);
            }}
            variant="primary"
          >
            Close sheet preview
          </Button>
        }
        onClose={() => {
          setIsSheetOpen(false);
        }}
        open={isSheetOpen}
        title="Sheet preview"
      >
        <StatusBanner title="Placeholder only" tone="info">
          The sheet demonstrates layout, safe-area padding, scrolling, and focus handling without an
          event form.
        </StatusBanner>
        <EmptyState title="No connected workflow">
          <p>Later milestones will decide what this sheet contains after data and auth exist.</p>
        </EmptyState>
      </Sheet>
    </div>
  );
}

function DestinationPreview({
  activeDestination,
  calendarRepository,
  onDialogOpen,
  onSelectDestination,
  onSheetOpen,
}: {
  activeDestination: DestinationId;
  calendarRepository?: CalendarRepository | undefined;
  onDialogOpen: () => void;
  onSelectDestination: (destination: DestinationId) => void;
  onSheetOpen: () => void;
}) {
  const active = getDestination(activeDestination);
  const isCalendarDestination = activeDestination === 'calendar' || activeDestination === 'add';

  return (
    <div className="cc-main__stack">
      <h2 className="sr-only" id="shell-destination-title">
        {active.heading}
      </h2>

      {isCalendarDestination ? (
        <CoupleHome
          calendarRepository={calendarRepository}
          key={activeDestination === 'add' ? 'add-event' : 'calendar'}
          onEventCreateClosed={() => {
            onSelectDestination('calendar');
          }}
          openEventCreate={activeDestination === 'add'}
        />
      ) : (
        <Surface
          actions={
            <>
              <Button
                onClick={() => {
                  onSelectDestination('search');
                }}
                variant="secondary"
              >
                <SearchIcon />
                Search placeholder
              </Button>
              <Button
                onClick={() => {
                  onSelectDestination('add');
                }}
                variant="primary"
              >
                <PlusIcon />
                Add event
              </Button>
            </>
          }
          description={active.description}
          title={active.heading}
        >
          <DestinationBody activeDestination={activeDestination} />
        </Surface>
      )}

      {isCalendarDestination ? null : (
        <div className="cc-two-column">
          <DesignSystemPreview onDialogOpen={onDialogOpen} onSheetOpen={onSheetOpen} />
          <StatePreview onSelectDestination={onSelectDestination} />
        </div>
      )}
    </div>
  );
}

function DestinationBody({ activeDestination }: { activeDestination: DestinationId }) {
  if (activeDestination === 'search') {
    return (
      <div className="cc-placeholder-grid">
        <StatusBanner title="Search is reserved" tone="info">
          Search inputs and filters are represented structurally only; no query logic is active.
        </StatusBanner>
        <TextField
          disabled
          hint="Disabled because search belongs to a later milestone."
          label="Search query preview"
          placeholder="Future event search"
        />
      </div>
    );
  }

  if (activeDestination === 'categories') {
    return (
      <div className="cc-category-preview" aria-label="Category placeholder preview">
        {['Shared', 'Logistics', 'Personal'].map((label) => (
          <span className="cc-category-preview__item" key={label}>
            <span className="cc-category-preview__swatch" aria-hidden="true" />
            {label} placeholder
          </span>
        ))}
      </div>
    );
  }

  if (activeDestination === 'settings') {
    return (
      <div className="cc-settings-stack">
        <ProfileSettings />
        <CoupleSettings />
      </div>
    );
  }

  return (
    <div className="cc-placeholder-grid">
      <EmptyState title="No couple workspace yet">
        <p>
          Authentication and profile setup are active. Couple creation, invitations, and shared
          calendar data are intentionally reserved for later milestones.
        </p>
      </EmptyState>
      <div className="cc-calendar-preview" aria-label="Calendar placeholder preview">
        <div className="cc-calendar-preview__toolbar">
          <Button variant="ghost">Previous</Button>
          <p className="cc-calendar-preview__month">August 2026 placeholder</p>
          <Button variant="ghost">Next</Button>
        </div>
        <div className="cc-calendar-preview__weekdays" aria-hidden="true">
          {weekdayLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="cc-calendar-preview__grid">
          {Array.from({ length: 35 }, (_, index) => (
            <span className="cc-calendar-preview__day" key={index}>
              {index >= 5 && index < 31 ? index - 4 : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesignSystemPreview({
  onDialogOpen,
  onSheetOpen,
}: {
  onDialogOpen: () => void;
  onSheetOpen: () => void;
}) {
  return (
    <Surface
      description="Reusable controls for later forms and shell actions."
      title="Design system preview"
    >
      <div className="cc-control-grid">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Quiet</Button>
        <Button variant="destructive">Destructive</Button>
        <Button disabled variant="secondary">
          Disabled
        </Button>
        <Button isLoading variant="primary">
          Loading
        </Button>
      </div>
      <div className="cc-form-preview" aria-label="Representative form controls">
        <TextField
          hint="Neutral shell-review field; not an event or profile form."
          label="Review label"
          placeholder="Placeholder text"
          required
        />
        <TextareaField
          error="Example error message for field association."
          label="Review notes"
          placeholder="Placeholder notes"
        />
        <SelectField
          hint="Native select control for future forms."
          label="State preview"
          options={fieldStateOptions}
        />
      </div>
      <div className="cc-control-grid">
        <Button onClick={onDialogOpen} variant="secondary">
          Open dialog
        </Button>
        <Button onClick={onSheetOpen} variant="secondary">
          Open sheet
        </Button>
      </div>
    </Surface>
  );
}

function StatePreview({
  onSelectDestination,
}: {
  onSelectDestination: (destination: DestinationId) => void;
}) {
  return (
    <Surface description="Representative state components for later screens." title="State preview">
      <div className="cc-state-stack">
        <StatusBanner title="Information state" tone="info">
          Offline and reconnecting variants can use this banner pattern later.
        </StatusBanner>
        <StatusBanner title="Success state" tone="success">
          Positive confirmation without relying on color alone.
        </StatusBanner>
        <StatusBanner
          action={
            <Button
              onClick={() => {
                onSelectDestination('settings');
              }}
              variant="ghost"
            >
              View placeholder
            </Button>
          }
          title="Warning state"
          tone="warning"
        >
          A non-destructive warning with an optional action.
        </StatusBanner>
        <StatusBanner title="Error state" tone="error">
          Failure states use explicit text and an error icon.
        </StatusBanner>
        <LoadingIndicator label="Loading shell preview" />
        <SkeletonStack count={3} />
        <EmptyState
          actionLabel="Open Add event"
          onAction={() => {
            onSelectDestination('add');
          }}
          title="Empty placeholder"
        >
          <p>No couple workspace, real calendar data, or event data is present yet.</p>
        </EmptyState>
      </div>
    </Surface>
  );
}
