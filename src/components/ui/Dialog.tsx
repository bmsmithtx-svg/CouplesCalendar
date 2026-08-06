import { useId, useRef, type ReactNode } from 'react';

import { CloseIcon } from '../../icons/AppIcons';
import { cx } from '../../lib/cx';
import { Button } from './Button';
import { useModalFocus } from './useModalFocus';

type DialogProps = {
  children: ReactNode;
  closeLabel?: string;
  description?: string;
  destructive?: boolean;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Dialog({
  children,
  closeLabel = 'Close dialog',
  description,
  destructive = false,
  footer,
  onClose,
  open,
  title,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = description ? `${titleId}-description` : undefined;
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useModalFocus(dialogRef, open);

  if (!open) {
    return null;
  }

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className={cx('cc-dialog', destructive && 'cc-dialog--destructive')}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
      ref={dialogRef}
    >
      <div className="cc-dialog__header">
        <div>
          <h2 className="cc-dialog__title" id={titleId}>
            {title}
          </h2>
          {description ? (
            <p className="cc-dialog__description" id={descriptionId}>
              {description}
            </p>
          ) : null}
        </div>
        <Button iconOnly onClick={onClose} aria-label={closeLabel} variant="ghost">
          <CloseIcon />
        </Button>
      </div>
      <div className="cc-dialog__body">{children}</div>
      {footer ? <div className="cc-dialog__footer">{footer}</div> : null}
    </dialog>
  );
}
