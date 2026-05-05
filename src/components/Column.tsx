import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Label, Status, Task, TaskLabel, TeamMember } from '../lib/types';
import { STATUS_LABEL } from '../lib/types';
import { TaskCard } from './TaskCard';
import { IconPlus } from './Icons';

interface Props {
  status: Status;
  tasks: Task[];
  members: TeamMember[];
  labels: Label[];
  taskLabels: TaskLabel[];
  commentCounts: Record<string, number>;
  onCreate: (status: Status) => void;
  onOpenTask: (taskId: string) => void;
  filtersActive: boolean;
}

export function Column({
  status,
  tasks,
  members,
  labels,
  taskLabels,
  commentCounts,
  onCreate,
  onOpenTask,
  filtersActive,
}: Props) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column:${status}`,
    data: { type: 'column', status },
  });

  const memberById = new Map(members.map((m) => [m.id, m]));
  const labelById = new Map(labels.map((l) => [l.id, l]));

  function labelsFor(taskId: string): Label[] {
    return taskLabels
      .filter((tl) => tl.task_id === taskId)
      .map((tl) => labelById.get(tl.label_id))
      .filter((l): l is Label => Boolean(l));
  }

  return (
    <section
      ref={setNodeRef}
      className={`column${isOver ? ' column--over' : ''}`}
      data-status={status}
      aria-label={STATUS_LABEL[status]}
    >
      <header className="column-head">
        <span className="column-accent" />
        <h2 className="column-title">{STATUS_LABEL[status]}</h2>
        <span className="column-count" aria-label={`${tasks.length} tasks`}>
          {tasks.length}
        </span>
        <button
          type="button"
          className="column-add"
          onClick={() => onCreate(status)}
          aria-label={`Add task to ${STATUS_LABEL[status]}`}
          title={`Add task to ${STATUS_LABEL[status]}`}
        >
          <IconPlus width={12} height={12} />
        </button>
      </header>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="column-body">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              assignee={t.assignee_id ? memberById.get(t.assignee_id) ?? null : null}
              labels={labelsFor(t.id)}
              commentCount={commentCounts[t.id] ?? 0}
              onOpen={onOpenTask}
            />
          ))}
          {tasks.length === 0 ? (
            <div className="column-empty">
              {filtersActive ? 'No matching tasks' : 'Drop tasks here'}
            </div>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}
