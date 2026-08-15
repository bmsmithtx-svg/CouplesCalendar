export function getSafeCalendarErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes('permission denied') ||
    message.includes('row-level security') ||
    message.includes('JWT')
  ) {
    return 'The current session cannot access this shared calendar.';
  }

  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'The shared calendar could not be reached. Check your connection and try again.';
  }

  return 'Shared calendar events are unavailable right now.';
}
