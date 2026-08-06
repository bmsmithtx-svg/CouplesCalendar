import { useId, type ReactNode } from 'react';

import { cx } from '../../lib/cx';

type SurfaceProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  title: string;
};

export function Surface({ actions, children, className, description, title }: SurfaceProps) {
  const titleId = useId();
  const descriptionId = description ? `${titleId}-description` : undefined;

  return (
    <section
      className={cx('cc-surface', className)}
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
    >
      <div className="cc-surface__header">
        <div>
          <h2 className="cc-surface__title" id={titleId}>
            {title}
          </h2>
          {description ? (
            <p className="cc-surface__description" id={descriptionId}>
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="cc-surface__actions">{actions}</div> : null}
      </div>
      <div className="cc-surface__body">{children}</div>
    </section>
  );
}
