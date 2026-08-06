import type { ReactNode } from 'react';

import { AlertTriangleIcon, CheckCircleIcon, InfoIcon, XCircleIcon } from '../../icons/AppIcons';
import { cx } from '../../lib/cx';

export type StatusTone = 'info' | 'success' | 'warning' | 'error';

type StatusBannerProps = {
  action?: ReactNode;
  children: ReactNode;
  title: string;
  tone?: StatusTone;
};

const statusIcons = {
  error: XCircleIcon,
  info: InfoIcon,
  success: CheckCircleIcon,
  warning: AlertTriangleIcon,
} satisfies Record<StatusTone, typeof InfoIcon>;

export function StatusBanner({ action, children, title, tone = 'info' }: StatusBannerProps) {
  const Icon = statusIcons[tone];
  const isAssertive = tone === 'warning' || tone === 'error';

  return (
    <div
      className={cx('cc-status', `cc-status--${tone}`)}
      role={isAssertive ? 'alert' : 'status'}
      aria-live={isAssertive ? 'assertive' : 'polite'}
    >
      <Icon className="cc-status__icon" />
      <div className="cc-status__content">
        <p className="cc-status__title">{title}</p>
        <div className="cc-status__message">{children}</div>
      </div>
      {action ? <div className="cc-status__action">{action}</div> : null}
    </div>
  );
}
