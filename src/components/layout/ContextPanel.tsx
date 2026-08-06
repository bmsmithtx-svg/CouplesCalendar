import type { ReactNode } from 'react';

type ContextPanelProps = {
  children: ReactNode;
  title: string;
};

export function ContextPanel({ children, title }: ContextPanelProps) {
  return (
    <aside className="cc-context-panel" aria-labelledby="shell-context-title">
      <h2 className="cc-context-panel__title" id="shell-context-title">
        {title}
      </h2>
      {children}
    </aside>
  );
}
