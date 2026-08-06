import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SelectField, TextareaField, TextField } from './Fields';

describe('field primitives', () => {
  it('associates labels, hints, required state, and errors with text inputs', () => {
    render(
      <TextField
        error="A value is required."
        hint="Used for reviewing field spacing."
        id="review-field"
        label="Review field"
        required
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Review field' });
    const hint = screen.getByText('Used for reviewing field spacing.');
    const error = screen.getByText('A value is required.');

    expect(input).toBeRequired();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', `${hint.id} ${error.id}`);
    expect(error).toHaveAttribute('role', 'alert');
  });

  it('renders textarea and native select controls with accessible labels', () => {
    render(
      <>
        <TextareaField id="notes" label="Review notes" />
        <SelectField
          id="state"
          label="State"
          options={[
            { label: 'Information', value: 'info' },
            { label: 'Warning', value: 'warning' },
          ]}
        />
      </>,
    );

    expect(screen.getByLabelText('Review notes')).toBeInstanceOf(HTMLTextAreaElement);
    expect(screen.getByLabelText('State')).toBeInstanceOf(HTMLSelectElement);
  });
});
