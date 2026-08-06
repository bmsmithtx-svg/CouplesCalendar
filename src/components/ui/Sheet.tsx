import { useId, useRef, type ReactNode } from 'react';

import { CloseIcon } from '../../icons/AppIcons';
import { Button } from './Button';
import { useModalFocus } from './useModalFocus';

type SheetProps = {
  children: ReactNode;
  closeLabel?: string;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Sheet({
  children,
  closeLabel = 'Close sheet',
  description,
  footer,
  onClose,
  open,
  title,
}: SheetProps) {
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
      className="cc-sheet"
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
      <div className="cc-sheet__header">
        <div>
          <h2 className="cc-sheet__title" id={titleId}>
            {title}
          </h2>
          {description ? (
            <p className="cc-sheet__description" id={descriptionId}>
              {description}
            </p>
          ) : null}
        </div>
        <Button iconOnly onClick={onClose} aria-label={closeLabel} variant="ghost">
          <CloseIcon />
        </Button>
      </div>
      <div className="cc-sheet__body">{children}</div>
      {footer ? <div className="cc-sheet__footer">{footer}</div> : null}
    </dialog>
  );
}
