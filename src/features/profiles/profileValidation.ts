import { isValidTimeZone } from '../../lib/timezones';
import type { ProfileFieldErrors, ProfileInput } from './profileTypes';

export const profileDisplayNameMaxLength = 80;

export function normalizeProfileInput(input: ProfileInput): ProfileInput {
  return {
    defaultTimezone: input.defaultTimezone.trim(),
    displayName: input.displayName.trim(),
  };
}

export function validateProfileInput(input: ProfileInput):
  | {
      ok: true;
      values: ProfileInput;
    }
  | {
      fieldErrors: ProfileFieldErrors;
      ok: false;
    } {
  const values = normalizeProfileInput(input);
  const fieldErrors: ProfileFieldErrors = {};

  if (!values.displayName) {
    fieldErrors.displayName = 'Enter a display name.';
  } else if (values.displayName.length > profileDisplayNameMaxLength) {
    fieldErrors.displayName = 'Display name must be 80 characters or fewer.';
  }

  if (!values.defaultTimezone) {
    fieldErrors.defaultTimezone = 'Choose a default timezone.';
  } else if (!isValidTimeZone(values.defaultTimezone)) {
    fieldErrors.defaultTimezone = 'Choose a valid IANA timezone.';
  }

  if (fieldErrors.displayName || fieldErrors.defaultTimezone) {
    return {
      fieldErrors,
      ok: false,
    };
  }

  return {
    ok: true,
    values,
  };
}
