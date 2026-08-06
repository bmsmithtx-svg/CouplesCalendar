import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Button } from './Button';
import { Sheet } from './Sheet';

function SheetHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Open sheet
      </Button>
      <Sheet
        description="Sheet description"
        footer={
          <Button
            onClick={() => {
              setOpen(false);
            }}
          >
            Close panel
          </Button>
        }
        onClose={() => {
          setOpen(false);
        }}
        open={open}
        title="Review sheet"
      >
        <p>Sheet body</p>
      </Sheet>
    </>
  );
}

describe('Sheet', () => {
  it('opens and closes with accessible naming and Escape dismissal', () => {
    render(<SheetHarness />);

    const trigger = screen.getByRole('button', { name: 'Open sheet' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Review sheet' })).toHaveAccessibleDescription(
      'Sheet description',
    );

    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Review sheet' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Review sheet' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(screen.queryByRole('dialog', { name: 'Review sheet' })).not.toBeInTheDocument();
  });
});
