import type { CSSProperties } from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Label, Priority } from '../lib/types';
import { PRIORITY_LABEL } from '../lib/types';
import { IconCalendar, IconFlag } from './Icons';

interface PriorityPillProps {
  priority: Priority;
  showIcon?: boolean;
}

export function PriorityPill({ priority, showIcon = true }: PriorityPillProps) {
  return (
    <span className={`pill pill--priority-${priority}`} title={`Priority: ${PRIORITY_LABEL[priority]}`}>
      {showIcon ? <IconFlag width={11} height={11} /> : null}
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

interface DueDateBadgeProps {
  dueDate: string; // YYYY-MM-DD
  showIcon?: boolean;
}

export function DueDateBadge({ dueDate, showIcon = true }: DueDateBadgeProps) {
  const date = parseISO(dueDate);
  const days = differenceInCalendarDays(date, new Date());
  let cls: string;
  let text: string;
  if (days < 0) {
    cls = 'pill--due-overdue';
    const n = Math.abs(days);
    text = n === 1 ? '1d overdue' : `${n}d overdue`;
  } else if (days === 0) {
    cls = 'pill--due-soon';
    text = 'Due today';
  } else if (days <= 2) {
    cls = 'pill--due-soon';
    text = days === 1 ? 'Due tomorrow' : `Due in ${days}d`;
  } else if (days <= 7) {
    cls = 'pill--due-future';
    text = `Due in ${days}d`;
  } else {
    cls = 'pill--due-future';
    text = format(date, 'MMM d');
  }
  return (
    <span className={`pill ${cls}`} title={`Due ${format(date, 'MMM d, yyyy')}`}>
      {showIcon ? <IconCalendar width={11} height={11} /> : null}
      {text}
    </span>
  );
}

interface LabelPillProps {
  label: Label;
  onRemove?: () => void;
}

export function LabelPill({ label, onRemove }: LabelPillProps) {
  return (
    <span
      className="pill pill--label"
      style={{ '--label-color': label.color } as CSSProperties}
      title={label.name}
    >
      {label.name}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label.name}`}
          style={{
            background: 'none',
            border: 'none',
            color: 'currentColor',
            cursor: 'pointer',
            padding: 0,
            marginLeft: 2,
            display: 'inline-flex',
            opacity: 0.7,
          }}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
