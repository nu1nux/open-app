/**
 * @fileoverview SVG icon components for the application UI.
 * @module renderer/icons
 */

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

export function NewThreadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M10 4v12M4 10h12" />
      <rect x="3" y="3" width="14" height="14" rx="4" />
    </svg>
  );
}

export function AutomationsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M10 4v3" />
      <path d="M10 13v3" />
      <path d="M4 10h3" />
      <path d="M13 10h3" />
      <circle cx="10" cy="10" r="4.5" />
    </svg>
  );
}

export function SkillsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M6 4h8l2 3-6 9-6-9z" />
      <path d="M6 4l4 5 4-5" />
    </svg>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M4 6h12" />
      <path d="M6 10h8" />
      <path d="M8 14h4" />
    </svg>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M3.5 6.5h5l1.5 1.5H16a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5V8a1.5 1.5 0 0 1 1.5-1.5z" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M8.2 3.5h3.6l.6 2.1 2 .8 1.8-1 2.5 2.5-1 1.8.8 2 2.1.6v3.6l-2.1.6-.8 2 1 1.8-2.5 2.5-1.8-1-2 .8-.6 2.1H8.2l-.6-2.1-2-.8-1.8 1-2.5-2.5 1-1.8-.8-2-2.1-.6v-3.6l2.1-.6.8-2-1-1.8 2.5-2.5 1.8 1 2-.8.6-2.1z" />
      <circle cx="10" cy="10" r="3" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M5 6h7a3 3 0 0 1 0 6H9" />
      <path d="M9 4l-3 2 3 2" />
    </svg>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M6 5h8" />
      <path d="M6 10h8" />
      <path d="M6 15h8" />
    </svg>
  );
}

export function WindowIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect x="3.5" y="4" width="13" height="12" rx="2" />
      <path d="M3.5 8h13" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M10 4v8" />
      <path d="M6.5 7.5L10 4l3.5 3.5" />
      <rect x="4" y="10" width="12" height="6" rx="2" />
    </svg>
  );
}

export function GamepadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect x="3" y="6" width="14" height="8" rx="4" />
      <circle cx="8" cy="10" r="1.5" />
      <path d="M12 9h4M14 7v4" />
    </svg>
  );
}

export function MagicWandIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M4 16l6-6 2 2-6 6H4z" />
      <path d="M12 4l4 4" />
      <path d="M14.5 2.5l1 1M17 5l1 1M11.5 1.5l1 1" />
    </svg>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect x="4" y="3" width="12" height="14" rx="2" />
      <path d="M7 7h6M7 10h6M7 13h4" />
    </svg>
  );
}

export function AttachIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M7 7v6a3 3 0 0 0 6 0V6" />
      <path d="M5 7a5 5 0 0 1 10 0v6a5 5 0 0 1-10 0V9" />
    </svg>
  );
}

export function MicrophoneIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect x="7" y="4" width="6" height="10" rx="3" />
      <path d="M4 10a6 6 0 0 0 12 0" />
      <path d="M10 16v2" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M4.5 6h11" />
      <path d="M8 6V4.5h4V6" />
      <rect x="5.5" y="6" width="9" height="10" rx="1.5" />
      <path d="M8.5 9v5M11.5 9v5" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M4 10l12-6-3.5 6L16 16z" />
    </svg>
  );
}
