// Tiny inline icon set so we don't add an icon dependency.
// All icons are 16x16 and use currentColor.

import type { SVGProps } from 'react';

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}
export function IconClose(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
export function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="7" cy="7" r="4.25" />
      <path d="M10 10l3 3" />
    </svg>
  );
}
export function IconCalendar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.5h11M5 2.5v2M11 2.5v2" />
    </svg>
  );
}
export function IconFlag(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 13.5V3l8 1.5L9 6.5l2.5 2L3.5 9.5" />
    </svg>
  );
}
export function IconChat(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 8c0-2.5 2-4.5 5.5-4.5s5.5 2 5.5 4.5-2 4.5-5.5 4.5c-.7 0-1.4-.08-2-.23L3 13.5l.7-2.2A4.6 4.6 0 0 1 2.5 8z" />
    </svg>
  );
}
export function IconClock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3.2L10 10" />
    </svg>
  );
}
export function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 4.5h10M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5 4.5l.7 8a1 1 0 0 0 1 .92h2.6a1 1 0 0 0 1-.92l.7-8" />
    </svg>
  );
}
export function IconUsers(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="6" cy="6" r="2.25" />
      <path d="M2 13.5c.4-2 2-3 4-3s3.6 1 4 3" />
      <circle cx="11.5" cy="6.5" r="1.75" />
      <path d="M10.5 10.5h.5c1.6 0 2.6.8 3 2.5" />
    </svg>
  );
}
export function IconTag(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M7.5 2.5H3v4.5L9.5 13l4-4L7.5 2.5z" />
      <circle cx="5.5" cy="5" r=".75" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function IconFilter(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 3.5h11l-4 5.5v4l-3-1.5v-2.5l-4-5.5z" />
    </svg>
  );
}
export function IconLogout(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 2.5h-6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h6" />
      <path d="M11 5.5L13.5 8 11 10.5M6.5 8h7" />
    </svg>
  );
}
export function IconDots(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="3.5" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="12.5" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}
