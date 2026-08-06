import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('App', () => {
  it('renders the application shell landmarks and representative content', () => {
    render(<App />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Calendar shell' })).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Phone primary navigation' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Desktop primary navigation' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Review context' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Design system preview' })).toBeInTheDocument();
    expect(screen.getByLabelText('Representative form controls')).toBeInTheDocument();
  });

  it('updates placeholder content and aria-current through phone navigation', () => {
    render(<App />);

    const phoneNav = screen.getByRole('navigation', { name: 'Phone primary navigation' });
    const searchButton = within(phoneNav).getByRole('button', { name: 'Search' });

    fireEvent.click(searchButton);

    expect(screen.getByRole('main', { name: 'Search and filters shell' })).toBeInTheDocument();
    expect(searchButton).toHaveAttribute('aria-current', 'page');

    const addButton = within(phoneNav).getByRole('button', { name: 'Add event' });
    addButton.focus();
    expect(addButton).toHaveFocus();

    fireEvent.click(addButton);

    expect(screen.getByRole('main', { name: 'Add event placeholder' })).toBeInTheDocument();
    expect(addButton).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Event creation is not implemented')).toBeInTheDocument();
  });

  it('supports desktop placeholder navigation including categories', () => {
    render(<App />);

    const desktopNav = screen.getByRole('navigation', { name: 'Desktop primary navigation' });
    const categoriesButton = within(desktopNav).getByRole('button', { name: 'Categories' });

    fireEvent.click(categoriesButton);

    expect(screen.getByRole('main', { name: 'Categories shell' })).toBeInTheDocument();
    expect(categoriesButton).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Category placeholder preview')).toBeInTheDocument();
  });

  it('opens and closes the representative dialog with focus return and Escape support', () => {
    render(<App />);

    const openDialogButton = screen.getByRole('button', { name: 'Open dialog preview' });
    openDialogButton.focus();
    fireEvent.click(openDialogButton);

    const dialog = screen.getByRole('dialog', { name: 'Destructive state preview' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAccessibleDescription(
      'A reusable confirmation surface for later destructive states. This preview does not change data.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    expect(
      screen.queryByRole('dialog', { name: 'Destructive state preview' }),
    ).not.toBeInTheDocument();
    expect(openDialogButton).toHaveFocus();

    fireEvent.click(openDialogButton);
    const reopenedDialog = screen.getByRole('dialog', { name: 'Destructive state preview' });
    fireEvent.keyDown(reopenedDialog, { key: 'Escape' });

    expect(
      screen.queryByRole('dialog', { name: 'Destructive state preview' }),
    ).not.toBeInTheDocument();
    expect(openDialogButton).toHaveFocus();
  });

  it('opens and closes the representative sheet with accessible naming', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Open sheet preview' }));

    expect(screen.getByRole('dialog', { name: 'Sheet preview' })).toHaveAccessibleDescription(
      'A reusable drawer for future focused phone forms and desktop detail panels.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close sheet preview' }));

    expect(screen.queryByRole('dialog', { name: 'Sheet preview' })).not.toBeInTheDocument();
  });
});
