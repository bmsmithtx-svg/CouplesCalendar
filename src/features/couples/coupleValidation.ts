export type CoupleInput = {
  name: string;
};

export type CoupleValidationResult =
  | {
      ok: true;
      values: CoupleInput;
    }
  | {
      errors: {
        name?: string | undefined;
      };
      ok: false;
    };

export function normalizeCoupleInput(input: CoupleInput): CoupleInput {
  return {
    name: input.name.trim(),
  };
}

export function validateCoupleInput(input: CoupleInput): CoupleValidationResult {
  const values = normalizeCoupleInput(input);

  if (values.name.length === 0) {
    return {
      errors: {
        name: 'Enter a couple name.',
      },
      ok: false,
    };
  }

  if (values.name.length > 80) {
    return {
      errors: {
        name: 'Use 80 characters or fewer.',
      },
      ok: false,
    };
  }

  return {
    ok: true,
    values,
  };
}
