import { useCallback, useMemo, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useBoardData } from './hooks/useBoardData';
import { ToastProvider } from './hooks/ToastProvider';
import { useToast } from './hooks/useToast';
import { Board } from './components/Board';
import { Header } from './components/Header';
import { FilterRow } from './components/FilterRow';
import { NewTaskModal } from './components/NewTaskModal';
import type { NewTaskValues } from './components/NewTaskModal';
import { TeamModal } from './components/TeamModal';
import { TaskDetailPanel } from './components/TaskDetailPanel';
import {
  createLabel,
  createTask,
  createTeamMember,
  deleteLabel,
  deleteTeamMember,
} from './lib/db';
import type { Priority, Status, Task } from './lib/types';

function AppShell() {
  const auth = useAuth();
  const { push } = useToast();
  const userId = auth.status === 'ready' ? auth.user.id : null;

  if (auth.status === 'loading') {
    return (
      <div className="app">
        <div className="center-screen">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <img
              src="/brand-mark.png"
              alt=""
              aria-hidden
              width={72}
              height={72}
              className="brand-mark"
              style={{ animation: 'pulse 1.5s infinite ease-in-out' }}
            />
            <span className="muted">Setting up your board…</span>
          </div>
        </div>
      </div>
    );
  }

  if (auth.status === 'misconfigured') {
    return <ConfigErrorScreen message={auth.error} />;
  }

  if (auth.status === 'error') {
    return <FatalErrorScreen message={auth.error} />;
  }

  return <BoardScreen userId={userId!} guestId={userId} pushToast={push} />;
}

function BoardScreen({
  userId,
  guestId,
  pushToast,
}: {
  userId: string;
  guestId: string | null;
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
      // Compute "next" position so the new card lands at the bottom of its column.
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
      // Optimistic update — realtime will reconcile.
      data.setTasks((prev) => [...prev, newTask]);
      if (values.label_ids.length) {
        data.setTaskLabels((prev) => [
          ...prev,
          ...values.label_ids.map((label_id) => ({ task_id: newTask.id, label_id, user_id: userId })),
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
        guestId={guestId}
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
            onError={onError}
          />
        )}
      </main>

      <NewTaskModal
        // Remount on each open so form state always starts fresh.
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
        // Remount the panel when the open task changes so internal state
        // (drafts, comment form, fetched activity) starts clean.
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
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'var(--accent-soft)',
          color: 'var(--accent)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 28,
          fontWeight: 700,
          border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
          cursor: 'pointer',
          transition: 'transform 120ms cubic-bezier(0.2,0.8,0.2,1), background 120ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
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

function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <div className="app">
      <div className="center-screen">
        <div className="empty">
          <h2>Setup needed</h2>
          <p>{message}</p>
          <p className="muted text-sm">
            Create a <code>.env</code> file in <code>task-board/</code> based on{' '}
            <code>.env.example</code> and restart the dev server.
          </p>
        </div>
      </div>
    </div>
  );
}

function FatalErrorScreen({ message }: { message: string }) {
  return (
    <div className="app">
      <div className="center-screen">
        <div className="empty">
          <h2>Could not sign in</h2>
          <p>{message}</p>
          <p className="muted text-sm">
            Make sure anonymous sign-in is enabled in your Supabase project's Auth settings.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
