import { describe, expect, it } from 'vitest';

import { validateProfileInput } from './profileValidation';

describe('validateProfileInput', () => {
  it('rejects unsupported timezone values', () => {
    expect(
      validateProfileInput({
        defaultTimezone: 'Mars/Base',
        displayName: 'Alex',
      }),
    ).toEqual({
      fieldErrors: {
        defaultTimezone: 'Choose a valid IANA timezone.',
      },
      ok: false,
    });
  });
});
