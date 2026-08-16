import type { ReactNode, SVGProps } from 'react';

import { cx } from '../lib/cx';

type IconProps = SVGProps<SVGSVGElement>;

function SvgIcon({ children, className, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={cx('size-5 shrink-0', className)}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M7 3v3" />
      <path d="M17 3v3" />
      <path d="M4.5 8.5h15" />
      <rect height="16" rx="2.5" width="15" x="4.5" y="5" />
      <path d="M8 12h2" />
      <path d="M14 12h2" />
      <path d="M8 16h2" />
    </SvgIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4.5 4.5" />
    </SvgIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </SvgIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-1.9.1l-.5.3a1.6 1.6 0 0 0-.8 1.6v.3h-4v-.3a1.6 1.6 0 0 0-.8-1.6l-.5-.3a1.7 1.7 0 0 0-1.9-.1l-.2.1-2-3.4.1-.1A1.6 1.6 0 0 0 4.9 15v-.6A1.6 1.6 0 0 0 3.5 13h-.3V9h.3a1.6 1.6 0 0 0 1.4-1.4V7a1.6 1.6 0 0 0-.3-1.8l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 1.9-.1l.5-.3A1.6 1.6 0 0 0 9.9 0h4a1.6 1.6 0 0 0 .8 1.4l.5.3a1.7 1.7 0 0 0 1.9.1l.2-.1 2 3.4-.1.1A1.6 1.6 0 0 0 19 7v.6A1.6 1.6 0 0 0 20.5 9h.3v4h-.3a1.6 1.6 0 0 0-1.1 2Z" />
    </SvgIcon>
  );
}

export function TagsIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4.5 5.5v6.2c0 .5.2 1 .6 1.4l6.5 6.5a2 2 0 0 0 2.8 0l4.7-4.7a2 2 0 0 0 0-2.8L12.6 5.6a2 2 0 0 0-1.4-.6H5a.5.5 0 0 0-.5.5Z" />
      <circle cx="8.5" cy="8.5" r="1" />
    </SvgIcon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.5v5" />
      <path d="M12 7.5h.01" />
    </SvgIcon>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.3 2.2 2.2 4.8-5" />
    </SvgIcon>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M10.4 4.8 3.6 17a2 2 0 0 0 1.7 3h13.4a2 2 0 0 0 1.7-3L13.6 4.8a1.8 1.8 0 0 0-3.2 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </SvgIcon>
  );
}

export function XCircleIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </SvgIcon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m6.5 6.5 11 11" />
      <path d="m17.5 6.5-11 11" />
    </SvgIcon>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4.5 19.5h4l10.2-10.2a2.1 2.1 0 0 0-3-3L5.5 16.5l-1 3Z" />
      <path d="m14.4 7.6 2 2" />
    </SvgIcon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 7h14" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M7 7.5 8 20h8l1-12.5" />
      <path d="M10.5 11v5" />
      <path d="M13.5 11v5" />
    </SvgIcon>
  );
}
