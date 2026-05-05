import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';
import type { Label, Task, TeamMember } from '../lib/types';
import { Avatar } from './Avatar';
import { DueDateBadge, LabelPill, PriorityPill } from './Pills';
import { IconChat } from './Icons';

interface Props {
  task: Task;
  assignee: TeamMember | null;
  labels: Label[];
  commentCount?: number;
  onOpen: (taskId: string) => void;
  isOverlay?: boolean;
}

export function TaskCard({ task, assignee, labels, commentCount, onOpen, isOverlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-priority={task.priority}
      className={[
        'card',
        isDragging ? 'card--dragging' : '',
        isOverlay ? 'card--overlay' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      // We make the whole card the drag handle and use a click handler to
      // open the detail panel.  dnd-kit's PointerSensor + an activation
      // distance lets us distinguish a click from a drag.
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        // Avoid opening when finishing a drag (synthetic click after pointerup).
        if ((e.target as HTMLElement).closest('button[data-stop-card]')) return;
        onOpen(task.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(task.id);
        }
      }}
      aria-label={`Open task: ${task.title}`}
    >
      <div className="card-priority-bar" aria-hidden />

      <div className="card-title">{task.title}</div>

      {task.description ? <div className="card-desc">{task.description}</div> : null}

      {labels.length > 0 ? (
        <div className="card-labels">
          {labels.map((l) => (
            <LabelPill key={l.id} label={l} />
          ))}
        </div>
      ) : null}

      <div className="card-meta">
        {task.priority !== 'normal' ? <PriorityPill priority={task.priority} showIcon={false} /> : null}
        {task.due_date ? <DueDateBadge dueDate={task.due_date} /> : null}
      </div>

      <div className="card-foot">
        {assignee ? (
          <Avatar member={assignee} size="sm" />
        ) : (
          <span className="card-meta-item muted">Unassigned</span>
        )}
        <div className="card-foot-spacer" />
        {commentCount && commentCount > 0 ? (
          <span className="card-comments-pill" title={`${commentCount} comments`}>
            <IconChat width={12} height={12} />
            {commentCount}
          </span>
        ) : null}
      </div>
    </div>
  );
}
