import { describe, expect, it } from 'vitest';

import { normalizeCoupleInput, validateCoupleInput } from './coupleValidation';

describe('couple validation', () => {
  it('trims couple names before saving', () => {
    expect(normalizeCoupleInput({ name: '  Home Team  ' })).toEqual({
      name: 'Home Team',
    });
  });

  it('requires a non-empty couple name', () => {
    expect(validateCoupleInput({ name: '   ' })).toEqual({
      errors: {
        name: 'Enter a couple name.',
      },
      ok: false,
    });
  });

  it('limits couple names to 80 characters', () => {
    expect(validateCoupleInput({ name: 'a'.repeat(81) })).toEqual({
      errors: {
        name: 'Use 80 characters or fewer.',
      },
      ok: false,
    });
  });
});
