import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useBoardData } from '../hooks/useBoardData';
import { useToast } from '../hooks/useToast';
import { Board } from '../components/Board';
import { Header } from '../components/Header';
import { FilterRow } from '../components/FilterRow';
import { NewTaskModal } from '../components/NewTaskModal';
import type { NewTaskValues } from '../components/NewTaskModal';
import { TeamModal } from '../components/TeamModal';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import {
  createLabel,
  createTask,
  createTeamMember,
  deleteLabel,
  deleteTask,
  deleteTeamMember,
} from '../lib/db';
import type { Priority, Status, Task } from '../lib/types';

export default function BoardPage() {
  const { user } = useAuth();
  const { push } = useToast();
  // RequireAuth guarantees user is non-null when this page renders.
  const userId = user!.id;

  return <BoardScreen userId={userId} pushToast={push} />;
}

function BoardScreen({
  userId,
  pushToast,
}: {
  userId: string;
  pushToast: (msg: string, tone?: 'info' | 'success' | 'error') => void;
}) {
  const data = useBoardData(userId);

  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set());
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'all' | 'unassigned'>('all');
  const [labelFilter, setLabelFilter] = useState<Set<string>>(new Set());

  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<Status>('todo');
  const [teamOpen, setTeamOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const openTask = useMemo(
    () => (openTaskId ? data.tasks.find((t) => t.id === openTaskId) ?? null : null),
    [openTaskId, data.tasks],
  );

  const onError = useCallback(
    (msg: string) => {
      pushToast(msg, 'error');
    },
    [pushToast],
  );

  const togglePriority = (p: Priority) =>
    setPriorityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  const toggleLabelFilter = (id: string) =>
    setLabelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clearFilters = () => {
    setPriorityFilter(new Set());
    setLabelFilter(new Set());
    setAssigneeFilter('all');
    setQuery('');
  };

  const hasFilters =
    query.trim().length > 0 ||
    priorityFilter.size > 0 ||
    labelFilter.size > 0 ||
    assigneeFilter !== 'all';

  async function handleCreateTask(values: NewTaskValues) {
    try {
      const positions = data.tasks
        .filter((t) => t.status === values.status)
        .map((t) => t.position);
      const maxPos = positions.length ? Math.max(...positions) : 0;
      const newTask = await createTask({
        userId,
        title: values.title,
        description: values.description || null,
        priority: values.priority,
        status: values.status,
        due_date: values.due_date,
        assignee_id: values.assignee_id,
        labelIds: values.label_ids,
        position: maxPos + 100,
      });
      data.setTasks((prev) => [...prev, newTask]);
      if (values.label_ids.length) {
        data.setTaskLabels((prev) => [
          ...prev,
          ...values.label_ids.map((label_id) => ({
            task_id: newTask.id,
            label_id,
            user_id: userId,
          })),
        ]);
      }
      pushToast('Task created', 'success');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create task');
    }
  }

  async function handleAddMember(name: string, color: string) {
    try {
      const m = await createTeamMember(userId, name, color);
      data.setMembers((prev) => [...prev, m]);
      pushToast(`Added ${m.name}`, 'success');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to add member');
    }
  }

  async function handleRemoveMember(id: string) {
    const prev = data.members;
    data.setMembers((p) => p.filter((m) => m.id !== id));
    try {
      await deleteTeamMember(id);
    } catch (err) {
      data.setMembers(prev);
      onError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  }

  async function handleAddLabel(name: string, color: string) {
    try {
      const l = await createLabel(userId, name, color);
      data.setLabels((prev) => [...prev, l]);
      pushToast(`Added label "${l.name}"`, 'success');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to add label');
    }
  }

  async function handleRemoveLabel(id: string) {
    const prev = data.labels;
    data.setLabels((p) => p.filter((l) => l.id !== id));
    try {
      await deleteLabel(id);
    } catch (err) {
      data.setLabels(prev);
      onError(err instanceof Error ? err.message : 'Failed to remove label');
    }
  }

  function handleTaskChanged(updated: Task) {
    data.setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }
  function handleTaskDeleted(id: string) {
    data.setTasks((prev) => prev.filter((t) => t.id !== id));
    setOpenTaskId(null);
    pushToast('Task deleted', 'success');
  }
  async function handleDeleteTaskFromCard(id: string) {
    const prev = data.tasks;
    data.setTasks((p) => p.filter((t) => t.id !== id));
    if (openTaskId === id) setOpenTaskId(null);
    try {
      await deleteTask(id);
      pushToast('Task deleted', 'success');
    } catch (err) {
      data.setTasks(prev);
      onError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  }
  function handleLabelsChanged(taskId: string, labelIds: string[]) {
    data.setTaskLabels((prev) => [
      ...prev.filter((tl) => tl.task_id !== taskId),
      ...labelIds.map((label_id) => ({ task_id: taskId, label_id, user_id: userId })),
    ]);
  }

  const onCreate = (status: Status) => {
    setNewTaskStatus(status);
    setNewTaskOpen(true);
  };

  return (
    <div className="app">
      <Header
        tasks={data.tasks}
        members={data.members}
        query={query}
        onQuery={setQuery}
        onNewTask={() => onCreate('todo')}
        onOpenTeam={() => setTeamOpen(true)}
      />

      <FilterRow
        members={data.members}
        labels={data.labels}
        priorityFilter={priorityFilter}
        onTogglePriority={togglePriority}
        assigneeFilter={assigneeFilter}
        onAssigneeFilter={setAssigneeFilter}
        labelFilter={labelFilter}
        onToggleLabel={toggleLabelFilter}
        onClear={clearFilters}
        hasFilters={hasFilters}
      />

      <main className="app-main">
        {data.loading ? (
          <SkeletonBoard />
        ) : data.error ? (
          <ErrorBlock message={data.error} onRetry={data.reload} />
        ) : data.tasks.length === 0 && !hasFilters ? (
          <EmptyBoard onCreate={() => onCreate('todo')} />
        ) : (
          <Board
            userId={userId}
            tasks={data.tasks}
            setTasks={data.setTasks}
            members={data.members}
            labels={data.labels}
            taskLabels={data.taskLabels}
            query={query}
            priorityFilter={priorityFilter}
            assigneeFilter={assigneeFilter}
            labelFilter={labelFilter}
            onCreate={onCreate}
            onOpenTask={setOpenTaskId}
            onDeleteTask={handleDeleteTaskFromCard}
            onError={onError}
          />
        )}
      </main>

      <NewTaskModal
        key={newTaskOpen ? `new-${newTaskStatus}-${data.tasks.length}` : 'new-closed'}
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        onSubmit={handleCreateTask}
        members={data.members}
        labels={data.labels}
        defaultStatus={newTaskStatus}
      />

      <TeamModal
        open={teamOpen}
        onClose={() => setTeamOpen(false)}
        members={data.members}
        labels={data.labels}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onAddLabel={handleAddLabel}
        onRemoveLabel={handleRemoveLabel}
      />

      <TaskDetailPanel
        key={openTask?.id ?? 'closed'}
        task={openTask}
        userId={userId}
        members={data.members}
        labels={data.labels}
        taskLabels={data.taskLabels}
        onClose={() => setOpenTaskId(null)}
        onTaskChanged={handleTaskChanged}
        onTaskDeleted={handleTaskDeleted}
        onLabelsChanged={handleLabelsChanged}
        onError={onError}
      />
    </div>
  );
}

function SkeletonBoard() {
  return (
    <div className="board">
      {[0, 1, 2, 3].map((i) => (
        <div className="column" key={i}>
          <div className="column-head">
            <span className="column-accent" />
            <div className="skeleton" style={{ width: 80, height: 14 }} />
          </div>
          <div className="column-body">
            {[0, 1, 2].map((j) => (
              <div key={j} className="skeleton skeleton-card" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyBoard({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="empty" style={{ flex: 1 }}>
      <button
        type="button"
        onClick={onCreate}
        aria-label="Create your first task"
        title="Create your first task"
        className="empty-orb"
      >
        +
      </button>
      <h2>Your board is empty</h2>
      <p>
        Create your first task to get started. You can drag cards across columns and add comments,
        labels, due dates, and assignees.
      </p>
      <button type="button" className="btn btn-primary" onClick={onCreate}>
        Create your first task
      </button>
    </div>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="empty" style={{ flex: 1 }}>
      <h2>Something went wrong</h2>
      <p>{message}</p>
      <button type="button" className="btn" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
