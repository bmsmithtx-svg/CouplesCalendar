import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Button } from './Button';
import { Dialog } from './Dialog';

function DialogHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Open dialog
      </Button>
      <Dialog
        description="Dialog description"
        footer={
          <Button
            onClick={() => {
              setOpen(false);
            }}
          >
            Done
          </Button>
        }
        onClose={() => {
          setOpen(false);
        }}
        open={open}
        title="Review dialog"
      >
        <p>Dialog body</p>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('opens with a name, closes explicitly, closes on Escape, and returns focus', () => {
    render(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Review dialog' })).toHaveAccessibleDescription(
      'Dialog description',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.queryByRole('dialog', { name: 'Review dialog' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Review dialog' }), { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Review dialog' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
