import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import { useId } from 'react';

import { cx } from '../../lib/cx';

type FieldBaseProps = {
  className?: string | undefined;
  error?: string | undefined;
  hint?: string | undefined;
  id?: string | undefined;
  label: string;
};

function getDescribedBy(hintId: string, errorId: string, hint?: string, error?: string) {
  return [hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ');
}

function FieldFrame({
  children,
  className,
  error,
  hint,
  id,
  label,
  required,
}: FieldBaseProps & {
  children: (field: {
    describedBy: string | undefined;
    errorId: string;
    fieldId: string;
  }) => ReactElement;
  required?: boolean | undefined;
}) {
  const generatedId = useId();
  const fieldId = id ?? `field-${generatedId}`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy = getDescribedBy(hintId, errorId, hint, error) || undefined;

  return (
    <div className={cx('cc-field', className)}>
      <label className="cc-field__label" htmlFor={fieldId}>
        <span>{label}</span>
        {required ? (
          <span className="cc-field__required" aria-hidden="true">
            Required
          </span>
        ) : null}
      </label>
      {children({ describedBy, errorId, fieldId })}
      {hint ? (
        <p className="cc-field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="cc-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type TextFieldProps = FieldBaseProps &
  Omit<ComponentPropsWithoutRef<'input'>, 'children' | 'className' | 'id'>;

export function TextField({ error, hint, id, label, required, ...props }: TextFieldProps) {
  return (
    <FieldFrame error={error} hint={hint} id={id} label={label} required={required}>
      {({ describedBy, fieldId }) => (
        <input
          className="cc-input"
          id={fieldId}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          {...props}
        />
      )}
    </FieldFrame>
  );
}

export type TextareaFieldProps = FieldBaseProps &
  Omit<ComponentPropsWithoutRef<'textarea'>, 'children' | 'className' | 'id'>;

export function TextareaField({
  error,
  hint,
  id,
  label,
  required,
  rows = 4,
  ...props
}: TextareaFieldProps) {
  return (
    <FieldFrame error={error} hint={hint} id={id} label={label} required={required}>
      {({ describedBy, fieldId }) => (
        <textarea
          className="cc-input cc-textarea"
          id={fieldId}
          required={required}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          {...props}
        />
      )}
    </FieldFrame>
  );
}

export type SelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

export type SelectFieldProps = FieldBaseProps &
  Omit<ComponentPropsWithoutRef<'select'>, 'children' | 'className' | 'id'> & {
    options: readonly SelectOption[];
  };

export function SelectField({
  error,
  hint,
  id,
  label,
  options,
  required,
  ...props
}: SelectFieldProps) {
  return (
    <FieldFrame error={error} hint={hint} id={id} label={label} required={required}>
      {({ describedBy, fieldId }) => (
        <select
          className="cc-input cc-select"
          id={fieldId}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          {...props}
        >
          {options.map((option) => (
            <option disabled={option.disabled} key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldFrame>
  );
}
