function readErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return typeof error === 'string' ? error : '';
}

export function getSafeCoupleErrorMessage(error: unknown) {
  const message = readErrorMessage(error).toLowerCase();

  if (message.includes('already_coupled')) {
    return 'This account already belongs to a couple.';
  }

  if (message.includes('couple_full') || message.includes('couple_member_limit')) {
    return 'That couple already has two members.';
  }

  if (message.includes('invalid_couple_name')) {
    return 'Enter a valid couple name.';
  }

  if (message.includes('invitation_unavailable')) {
    return 'A new invitation is not available for this couple.';
  }

  if (message.includes('no_active_couple')) {
    return 'Create a couple before inviting someone.';
  }

  if (message.includes('permission')) {
    return 'The current session cannot perform that couple action.';
  }

  if (message.includes('profile_required')) {
    return 'Complete your profile before using couple features.';
  }

  return 'The couple action could not be completed. Try again.';
}
