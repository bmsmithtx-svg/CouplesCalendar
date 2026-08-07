function getErrorText(error: unknown) {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === 'string') {
      return message.toLowerCase();
    }
  }

  return '';
}

export function getSafeAuthErrorMessage(error: unknown) {
  const message = getErrorText(error);

  if (message.includes('invalid login credentials')) {
    return 'The email or password did not match an account.';
  }

  if (message.includes('already registered') || message.includes('already exists')) {
    return 'An account with this email may already exist. Try signing in instead.';
  }

  if (message.includes('password')) {
    return 'The password does not meet the authentication provider requirements.';
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('failed')) {
    return 'The authentication service could not be reached. Check your connection and try again.';
  }

  if (message.includes('expired') || message.includes('jwt')) {
    return 'Your session is no longer valid. Sign in again to continue.';
  }

  return 'Authentication could not be completed. Try again.';
}

export function getSafeProfileErrorMessage(error: unknown) {
  const message = getErrorText(error);

  if (message.includes('permission') || message.includes('row-level') || message.includes('rls')) {
    return 'Your profile could not be accessed with the current session.';
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('failed')) {
    return 'The profile service could not be reached. Check your connection and try again.';
  }

  return 'Your profile could not be loaded or saved. Try again.';
}
