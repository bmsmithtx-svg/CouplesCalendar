import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('App', () => {
  it('renders the CouplesCalendar foundation screen', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'CouplesCalendar' })).toBeInTheDocument();
    expect(screen.getByText('Workspace foundation is operational.')).toBeInTheDocument();
  });
});
