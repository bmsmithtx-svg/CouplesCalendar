import type { ComponentType } from 'react';

import type { DestinationId } from '../../app/navigation';
import { destinationConfig } from '../../app/navigation';
import { CalendarIcon, PlusIcon, SearchIcon, SettingsIcon, TagsIcon } from '../../icons/AppIcons';
import { cx } from '../../lib/cx';

type NavigationProps = {
  activeDestination: DestinationId;
  items: readonly DestinationId[];
  label: string;
  onDestinationChange: (destination: DestinationId) => void;
};

const destinationIcons = {
  add: PlusIcon,
  calendar: CalendarIcon,
  categories: TagsIcon,
  search: SearchIcon,
  settings: SettingsIcon,
} satisfies Record<DestinationId, ComponentType<{ className?: string }>>;

function NavigationButton({
  activeDestination,
  destination,
  onDestinationChange,
  variant,
}: {
  activeDestination: DestinationId;
  destination: DestinationId;
  onDestinationChange: (destination: DestinationId) => void;
  variant: 'bottom' | 'sidebar';
}) {
  const config = destinationConfig[destination];
  const Icon = destinationIcons[destination];
  const isActive = activeDestination === destination;
  const label = variant === 'sidebar' ? (config.desktopLabel ?? config.label) : config.label;

  return (
    <button
      aria-current={isActive ? 'page' : undefined}
      className={cx(
        variant === 'bottom' ? 'cc-bottom-nav__button' : 'cc-sidebar-nav__button',
        isActive && `${variant === 'bottom' ? 'cc-bottom-nav' : 'cc-sidebar-nav'}__button--active`,
      )}
      data-destination={destination}
      onClick={() => {
        onDestinationChange(destination);
      }}
      type="button"
    >
      <Icon className={variant === 'bottom' ? 'cc-bottom-nav__icon' : 'cc-sidebar-nav__icon'} />
      <span>{label}</span>
      {isActive ? <span className="cc-nav-active-marker" aria-hidden="true" /> : null}
    </button>
  );
}

export function BottomNavigation({
  activeDestination,
  items,
  label,
  onDestinationChange,
}: NavigationProps) {
  return (
    <nav className="cc-bottom-nav" aria-label={label}>
      {items.map((destination) => (
        <NavigationButton
          activeDestination={activeDestination}
          destination={destination}
          key={destination}
          onDestinationChange={onDestinationChange}
          variant="bottom"
        />
      ))}
    </nav>
  );
}

export function SidebarNavigation({
  activeDestination,
  items,
  label,
  onDestinationChange,
}: NavigationProps) {
  return (
    <nav className="cc-sidebar-nav" aria-label={label}>
      <div className="cc-sidebar-nav__brand" aria-hidden="true">
        <span className="cc-sidebar-nav__brand-mark">CC</span>
        <span>CouplesCalendar</span>
      </div>
      <NavigationButton
        activeDestination={activeDestination}
        destination="add"
        onDestinationChange={onDestinationChange}
        variant="sidebar"
      />
      <div className="cc-sidebar-nav__items">
        {items.map((destination) => (
          <NavigationButton
            activeDestination={activeDestination}
            destination={destination}
            key={destination}
            onDestinationChange={onDestinationChange}
            variant="sidebar"
          />
        ))}
      </div>
    </nav>
  );
}
