import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Label, Priority, Status, Task, TaskLabel, TeamMember } from '../lib/types';
import { STATUSES } from '../lib/types';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { logActivity, updateTask } from '../lib/db';
import { supabase } from '../lib/supabase';

interface Props {
  userId: string;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  members: TeamMember[];
  labels: Label[];
  taskLabels: TaskLabel[];
  query: string;
  priorityFilter: Set<Priority>;
  assigneeFilter: string | 'all' | 'unassigned';
  labelFilter: Set<string>;
  onCreate: (status: Status) => void;
  onOpenTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onError: (msg: string) => void;
}

export function Board({
  userId,
  tasks,
  setTasks,
  members,
  labels,
  taskLabels,
  query,
  priorityFilter,
  assigneeFilter,
  labelFilter,
  onCreate,
  onOpenTask,
  onDeleteTask,
  onError,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a small drag distance so clicks (to open the panel) still work.
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Fetch comment counts for all tasks (lightweight) for the badge on cards.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('task_id')
          .eq('user_id', userId);
        if (error) throw error;
        if (cancelled) return;
        const counts: Record<string, number> = {};
        for (const row of data ?? []) {
          counts[row.task_id] = (counts[row.task_id] ?? 0) + 1;
        }
        setCommentCounts(counts);
      } catch {
        // Non-fatal: just skip the badge.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, tasks.length]);

  // Filter + group tasks by status.
  const filteredByStatus = useMemo(() => {
    const q = query.trim().toLowerCase();
    const labelsByTask = new Map<string, Set<string>>();
    for (const tl of taskLabels) {
      const set = labelsByTask.get(tl.task_id) ?? new Set<string>();
      set.add(tl.label_id);
      labelsByTask.set(tl.task_id, set);
    }

    const filtered = tasks.filter((t) => {
      if (q && !`${t.title} ${t.description ?? ''}`.toLowerCase().includes(q)) return false;
      if (priorityFilter.size > 0 && !priorityFilter.has(t.priority)) return false;
      if (assigneeFilter === 'unassigned' && t.assignee_id) return false;
      if (assigneeFilter !== 'all' && assigneeFilter !== 'unassigned' && t.assignee_id !== assigneeFilter) {
        return false;
      }
      if (labelFilter.size > 0) {
        const set = labelsByTask.get(t.id);
        if (!set) return false;
        for (const id of labelFilter) if (!set.has(id)) return false;
      }
      return true;
    });

    const grouped: Record<Status, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] };
    for (const t of filtered) grouped[t.status].push(t);
    for (const s of STATUSES) grouped[s].sort((a, b) => a.position - b.position);
    return grouped;
  }, [tasks, taskLabels, query, priorityFilter, assigneeFilter, labelFilter]);

  const filtersActive =
    query.trim().length > 0 ||
    priorityFilter.size > 0 ||
    labelFilter.size > 0 ||
    assigneeFilter !== 'all';

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  // Keep a ref to the latest tasks for use inside the dnd handler closures.
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeTaskId = String(active.id);
    const movedTask = tasksRef.current.find((t) => t.id === activeTaskId);
    if (!movedTask) return;

    // Determine destination status + position.
    let destStatus: Status;
    let destIndex: number;
    const grouped: Record<Status, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] };
    for (const t of tasksRef.current) grouped[t.status].push(t);
    for (const s of STATUSES) grouped[s].sort((a, b) => a.position - b.position);

    if (over.data.current?.type === 'column') {
      destStatus = over.data.current.status as Status;
      destIndex = grouped[destStatus].length;
    } else {
      const overTask = tasksRef.current.find((t) => t.id === String(over.id));
      if (!overTask) return;
      destStatus = overTask.status;
      destIndex = grouped[destStatus].findIndex((t) => t.id === overTask.id);
    }

    // Compute the new "position" as average of neighbours in the dest list.
    // Strip the active task from the destination list to compute neighbours
    // accurately when it's moving inside the same column.
    const destList = grouped[destStatus].filter((t) => t.id !== activeTaskId);
    const before = destList[destIndex - 1];
    const after = destList[destIndex];
    let newPosition: number;
    if (!before && !after) newPosition = 1000;
    else if (!before && after) newPosition = after.position - 100;
    else if (before && !after) newPosition = before.position + 100;
    else newPosition = (before!.position + after!.position) / 2;

    const isStatusChange = destStatus !== movedTask.status;
    if (
      !isStatusChange &&
      movedTask.position === newPosition // no-op
    ) {
      return;
    }

    const prev = tasksRef.current;
    const optimistic = prev.map((t) =>
      t.id === activeTaskId ? { ...t, status: destStatus, position: newPosition } : t,
    );
    setTasks(optimistic);

    try {
      await updateTask(activeTaskId, { status: destStatus, position: newPosition });
      if (isStatusChange) {
        await logActivity({
          task_id: activeTaskId,
          user_id: userId,
          kind: 'status',
          from_value: movedTask.status,
          to_value: destStatus,
        });
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to move task');
      setTasks(prev); // rollback
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="board">
        {STATUSES.map((s) => (
          <Column
            key={s}
            status={s}
            tasks={filteredByStatus[s]}
            members={members}
            labels={labels}
            taskLabels={taskLabels}
            commentCounts={commentCounts}
            onCreate={onCreate}
            onOpenTask={onOpenTask}
            onDeleteTask={onDeleteTask}
            filtersActive={filtersActive}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200 }}>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            assignee={
              activeTask.assignee_id ? members.find((m) => m.id === activeTask.assignee_id) ?? null : null
            }
            labels={labels.filter((l) =>
              taskLabels.some((tl) => tl.task_id === activeTask.id && tl.label_id === l.id),
            )}
            commentCount={commentCounts[activeTask.id] ?? 0}
            onOpen={() => {}}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
