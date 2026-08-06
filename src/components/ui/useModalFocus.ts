import { useEffect, type RefObject } from 'react';

const focusableSelector = [
  '[data-autofocus]',
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useModalFocus(dialogRef: RefObject<HTMLDialogElement | null>, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const dialog = dialogRef.current;
    const previousElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!dialog) {
      return () => {
        previousElement?.focus();
      };
    }

    if (typeof dialog.showModal === 'function') {
      try {
        if (!dialog.open) {
          dialog.showModal();
        }
      } catch {
        dialog.setAttribute('open', '');
      }
    } else {
      dialog.setAttribute('open', '');
    }

    const focusTarget = dialog.querySelector<HTMLElement>(focusableSelector);
    window.setTimeout(() => {
      focusTarget?.focus();
    }, 0);

    return () => {
      if (dialog.open && typeof dialog.close === 'function') {
        try {
          dialog.close();
        } catch {
          dialog.removeAttribute('open');
        }
      } else {
        dialog.removeAttribute('open');
      }

      previousElement?.focus();
    };
  }, [dialogRef, isOpen]);
}
