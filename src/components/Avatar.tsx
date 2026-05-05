import type { CSSProperties } from 'react';
import type { TeamMember } from '../lib/types';

interface Props {
  member: TeamMember | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts.length || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ member, size = 'md', title }: Props) {
  if (!member) {
    return (
      <span
        className={`avatar avatar--${size === 'md' ? '' : size}`}
        style={{ '--avatar-bg': 'var(--gray-300)' } as CSSProperties}
        title={title ?? 'Unassigned'}
        aria-label={title ?? 'Unassigned'}
      >
        ?
      </span>
    );
  }
  return (
    <span
      className={`avatar${size === 'md' ? '' : ` avatar--${size}`}`}
      style={{ '--avatar-bg': member.color } as CSSProperties}
      title={title ?? member.name}
      aria-label={title ?? member.name}
    >
      {initials(member.name)}
    </span>
  );
}
