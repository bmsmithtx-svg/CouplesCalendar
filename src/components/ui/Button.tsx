import type { ButtonHTMLAttributes } from 'react';

import { cx } from '../../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  iconOnly?: boolean;
  isLoading?: boolean;
  variant?: ButtonVariant;
};

export function Button({
  children,
  className,
  disabled,
  iconOnly = false,
  isLoading = false,
  type = 'button',
  variant = 'secondary',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={cx(
        'cc-button',
        `cc-button--${variant}`,
        iconOnly && 'cc-button--icon-only',
        className,
      )}
      disabled={isDisabled}
      type={type}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <span className="cc-spinner cc-button__spinner" aria-hidden="true" /> : null}
      <span className={cx(isLoading && 'cc-button__loading-content')}>{children}</span>
    </button>
  );
}
