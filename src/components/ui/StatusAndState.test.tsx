import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './Button';
import { EmptyState, LoadingIndicator, SkeletonStack } from './LoadingStates';
import { StatusBanner } from './StatusBanner';

describe('status and state primitives', () => {
  it('uses polite status and assertive alert semantics for banners', () => {
    render(
      <>
        <StatusBanner title="Information" tone="info">
          Informational message.
        </StatusBanner>
        <StatusBanner action={<Button>Retry</Button>} title="Error" tone="error">
          Error message.
        </StatusBanner>
      </>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Information');
    expect(screen.getByRole('alert')).toHaveTextContent('Error');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders accessible loading, skeleton, and empty states', () => {
    render(
      <>
        <LoadingIndicator label="Loading calendar shell" />
        <SkeletonStack label="Loading placeholder rows" />
        <EmptyState title="Nothing connected yet">Placeholder empty state.</EmptyState>
      </>,
    );

    expect(screen.getByText('Loading calendar shell')).toBeInTheDocument();
    expect(screen.getByText('Loading placeholder rows')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nothing connected yet' })).toBeInTheDocument();
  });
});
