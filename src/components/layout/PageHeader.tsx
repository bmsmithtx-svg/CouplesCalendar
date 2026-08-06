import type { ReactNode } from 'react';

type PageHeaderProps = {
  actions?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <header className="cc-page-header">
      <div>
        <p className="cc-eyebrow">{eyebrow}</p>
        <h1 className="cc-page-header__title">{title}</h1>
        <p className="cc-page-header__description">{description}</p>
      </div>
      {actions ? <div className="cc-page-header__actions">{actions}</div> : null}
    </header>
  );
}
