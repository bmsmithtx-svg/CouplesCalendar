import type { ReactNode } from 'react';

import { cx } from '../../lib/cx';
import { Button } from './Button';

type LoadingIndicatorProps = {
  label?: string;
};

export function LoadingIndicator({ label = 'Loading' }: LoadingIndicatorProps) {
  return (
    <div className="cc-loading" role="status" aria-live="polite">
      <span className="cc-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

type SkeletonStackProps = {
  count?: number;
  label?: string;
};

export function SkeletonStack({
  count = 3,
  label = 'Loading placeholder content',
}: SkeletonStackProps) {
  return (
    <div className="cc-skeleton-stack" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <span
          className={cx('cc-skeleton', index === count - 1 && 'cc-skeleton--short')}
          key={index}
        />
      ))}
    </div>
  );
}

type EmptyStateProps = {
  actionLabel?: string;
  children: ReactNode;
  onAction?: () => void;
  title: string;
};

export function EmptyState({ actionLabel, children, onAction, title }: EmptyStateProps) {
  return (
    <div className="cc-empty">
      <div className="cc-empty__mark" aria-hidden="true" />
      <div>
        <h3 className="cc-empty__title">{title}</h3>
        <div className="cc-empty__body">{children}</div>
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
