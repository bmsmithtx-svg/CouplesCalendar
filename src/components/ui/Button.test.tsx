import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlusIcon } from '../../icons/AppIcons';
import { Button } from './Button';

describe('Button', () => {
  it('renders supported variants and keeps type button by default', () => {
    render(
      <>
        <Button variant="primary">Primary action</Button>
        <Button variant="secondary">Secondary action</Button>
        <Button variant="ghost">Quiet action</Button>
        <Button variant="destructive">Delete action</Button>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Primary action' })).toHaveAttribute(
      'type',
      'button',
    );
    expect(screen.getByRole('button', { name: 'Secondary action' })).toHaveClass(
      'cc-button--secondary',
    );
    expect(screen.getByRole('button', { name: 'Quiet action' })).toHaveClass('cc-button--ghost');
    expect(screen.getByRole('button', { name: 'Delete action' })).toHaveClass(
      'cc-button--destructive',
    );
  });

  it('supports disabled, loading, and icon-only behavior', () => {
    render(
      <>
        <Button disabled>Disabled action</Button>
        <Button isLoading>Loading action</Button>
        <Button iconOnly aria-label="Add placeholder">
          <PlusIcon />
        </Button>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Disabled action' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Loading action' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Loading action' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Add placeholder' })).toHaveClass(
      'cc-button--icon-only',
    );
  });
});
