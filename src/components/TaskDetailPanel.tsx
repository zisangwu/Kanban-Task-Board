import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  createComment,
  deleteComment,
  deleteTask,
  fetchActivity,
  fetchComments,
  logActivity,
  setTaskLabels,
  updateTask,
} from '../lib/db';
import type {
  ActivityEntry,
  Comment,
  Label,
  Priority,
  Status,
  Task,
  TaskLabel,
  TeamMember,
} from '../lib/types';
import { PRIORITY_LABEL, STATUSES, STATUS_LABEL } from '../lib/types';
import { Avatar } from './Avatar';
import { LabelPill, PriorityPill } from './Pills';
import { IconClose, IconTrash } from './Icons';

interface Props {
  task: Task | null;
  userId: string;
  members: TeamMember[];
  labels: Label[];
  taskLabels: TaskLabel[];
  onClose: () => void;
  onTaskChanged: (task: Task) => void;
  onTaskDeleted: (taskId: string) => void;
  onLabelsChanged: (taskId: string, labelIds: string[]) => void;
  onError: (message: string) => void;
}

// Public wrapper: the parent should provide a `key={task?.id}` so the inner
// form remounts (and resets all local state) when the open task changes.
export function TaskDetailPanel(props: Props) {
  if (!props.task) return null;
  return <TaskDetailPanelInner {...props} task={props.task} />;
}

interface InnerProps extends Omit<Props, 'task'> {
  task: Task;
}

function TaskDetailPanelInner({
  task: t,
  userId,
  members,
  labels,
  taskLabels,
  onClose,
  onTaskChanged,
  onTaskDeleted,
  onLabelsChanged,
  onError,
}: InnerProps) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(t.title);
  const [draftDesc, setDraftDesc] = useState(t.description ?? '');
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [busy, setBusy] = useState(false);

  // Load comments + activity for this task.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, a] = await Promise.all([fetchComments(t.id), fetchActivity(t.id)]);
        if (!cancelled) {
          setComments(c);
          setActivity(a);
        }
      } catch (err) {
        if (!cancelled) onError(err instanceof Error ? err.message : 'Failed to load task details');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t.id, onError]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const assignee = t.assignee_id ? members.find((m) => m.id === t.assignee_id) ?? null : null;
  const myLabelIds = taskLabels.filter((tl) => tl.task_id === t.id).map((tl) => tl.label_id);
  const myLabels = labels.filter((l) => myLabelIds.includes(l.id));

  async function patch(
    update: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'assignee_id'>>,
    activityKind?: { kind: ActivityEntry['kind']; from?: string | null; to?: string | null },
  ) {
    setBusy(true);
    try {
      const updated = await updateTask(t.id, update);
      onTaskChanged(updated);
      if (activityKind) {
        await logActivity({
          task_id: t.id,
          user_id: userId,
          kind: activityKind.kind,
          from_value: activityKind.from ?? null,
          to_value: activityKind.to ?? null,
        });
        setActivity(await fetchActivity(t.id));
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveTitleDesc() {
    const titleChanged = draftTitle.trim() !== t.title;
    const descChanged = (draftDesc || '') !== (t.description ?? '');
    if (!draftTitle.trim()) return;
    if (titleChanged) {
      await patch({ title: draftTitle.trim() }, { kind: 'title', from: t.title, to: draftTitle.trim() });
    }
    if (descChanged) {
      await patch(
        { description: draftDesc || null },
        { kind: 'description', from: t.description ?? '', to: draftDesc || '' },
      );
    }
    setEditing(false);
  }

  async function changeStatus(s: Status) {
    if (s === t.status) return;
    await patch({ status: s }, { kind: 'status', from: t.status, to: s });
  }
  async function changePriority(p: Priority) {
    if (p === t.priority) return;
    await patch({ priority: p }, { kind: 'priority', from: t.priority, to: p });
  }
  async function changeDueDate(d: string) {
    const value = d || null;
    if (value === t.due_date) return;
    await patch({ due_date: value }, { kind: 'due_date', from: t.due_date ?? '', to: value ?? '' });
  }
  async function changeAssignee(id: string) {
    const value = id || null;
    if (value === t.assignee_id) return;
    const fromName = members.find((m) => m.id === t.assignee_id)?.name ?? 'Unassigned';
    const toName = members.find((m) => m.id === value)?.name ?? 'Unassigned';
    await patch({ assignee_id: value }, { kind: 'assignee', from: fromName, to: toName });
  }

  async function toggleLabel(label: Label) {
    const has = myLabelIds.includes(label.id);
    const next = has ? myLabelIds.filter((id) => id !== label.id) : [...myLabelIds, label.id];
    try {
      await setTaskLabels(t.id, userId, next);
      onLabelsChanged(t.id, next);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update labels');
    }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    const body = commentBody.trim();
    if (!body) return;
    try {
      const c = await createComment(t.id, userId, body);
      setComments((prev) => [...prev, c]);
      setCommentBody('');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to post comment');
    }
  }

  async function removeComment(id: string) {
    try {
      await deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  }

  async function handleDeleteTask() {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      await deleteTask(t.id);
      onTaskDeleted(t.id);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  }

  return createPortal(
    <>
      <div className="modal-backdrop" onClick={onClose} aria-hidden />
      <aside className="panel" role="dialog" aria-modal="true" aria-label={`Task: ${t.title}`}>
        <header className="panel-head">
          <select
            className="form-select"
            value={t.status}
            onChange={(e) => changeStatus(e.target.value as Status)}
            disabled={busy}
            style={{ width: 160 }}
            aria-label="Status"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={handleDeleteTask}
            aria-label="Delete task"
            title="Delete task"
          >
            <IconTrash />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close panel"
          >
            <IconClose />
          </button>
        </header>

        <div className="panel-body">
          <section className="detail-section">
            {editing ? (
              <>
                <input
                  className="form-input"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  style={{ fontSize: 18, fontWeight: 600 }}
                  maxLength={200}
                />
                <textarea
                  className="form-textarea"
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  placeholder="Add a description…"
                />
                <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!draftTitle.trim() || busy}
                    onClick={saveTitleDesc}
                  >
                    Save
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'text',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
                aria-label="Edit title and description"
              >
                <h2 style={{ fontSize: 20, lineHeight: 1.3 }}>{t.title}</h2>
                {t.description ? (
                  <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text)', fontSize: 13 }}>
                    {t.description}
                  </p>
                ) : (
                  <p className="muted text-sm">Click to add a description…</p>
                )}
              </button>
            )}
          </section>

          <hr className="hr" />

          <section className="detail-section">
            <h3 className="detail-section-title">Properties</h3>

            <div className="form-grid-2">
              <div className="form-row">
                <label className="form-label" htmlFor="d-priority">Priority</label>
                <select
                  id="d-priority"
                  className="form-select"
                  value={t.priority}
                  onChange={(e) => changePriority(e.target.value as Priority)}
                  disabled={busy}
                >
                  {(['low', 'normal', 'high'] as Priority[]).map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label" htmlFor="d-due">Due date</label>
                <input
                  id="d-due"
                  type="date"
                  className="form-input"
                  value={t.due_date ?? ''}
                  onChange={(e) => changeDueDate(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="d-assign">Assignee</label>
              <select
                id="d-assign"
                className="form-select"
                value={t.assignee_id ?? ''}
                onChange={(e) => changeAssignee(e.target.value)}
                disabled={busy}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {assignee ? (
                <div className="row" style={{ marginTop: 4 }}>
                  <Avatar member={assignee} size="sm" />
                  <span className="muted text-sm">{assignee.name}</span>
                </div>
              ) : null}
            </div>

            <div className="form-row">
              <span className="form-label">Labels</span>
              {labels.length === 0 ? (
                <p className="muted text-sm">No labels yet. Create some from the Team & labels dialog.</p>
              ) : (
                <div className="label-picker">
                  {labels.map((l) => {
                    const active = myLabelIds.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => toggleLabel(l)}
                        className="pill pill--label"
                        aria-pressed={active}
                        style={{
                          '--label-color': l.color,
                          cursor: 'pointer',
                          opacity: active ? 1 : 0.55,
                          borderStyle: active ? 'solid' : 'dashed',
                        } as CSSProperties}
                      >
                        {l.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="row row--wrap" style={{ marginTop: 6 }}>
              <PriorityPill priority={t.priority} />
              {myLabels.map((l) => (
                <LabelPill key={l.id} label={l} />
              ))}
            </div>
          </section>

          <hr className="hr" />

          <section className="detail-section">
            <h3 className="detail-section-title">Comments</h3>
            {comments.length === 0 ? (
              <p className="muted text-sm">No comments yet.</p>
            ) : (
              <ul className="comment-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {comments.map((c) => (
                  <li key={c.id} className="comment">
                    <div className="comment-meta">
                      <Avatar member={null} size="sm" />
                      <span>You</span>
                      <span>·</span>
                      <span title={format(parseISO(c.created_at), 'PPpp')}>
                        {formatDistanceToNow(parseISO(c.created_at), { addSuffix: true })}
                      </span>
                      <span style={{ flex: 1 }} />
                      <button
                        type="button"
                        onClick={() => removeComment(c.id)}
                        aria-label="Delete comment"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-faint)',
                          cursor: 'pointer',
                          fontSize: 11,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                    {c.body}
                  </li>
                ))}
              </ul>
            )}
            <form className="comment-form" onSubmit={addComment}>
              <textarea
                className="form-textarea"
                placeholder="Write a comment…"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={3}
                maxLength={2000}
              />
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={!commentBody.trim()}>
                  Post comment
                </button>
              </div>
            </form>
          </section>

          <hr className="hr" />

          <section className="detail-section">
            <h3 className="detail-section-title">Activity</h3>
            {activity.length === 0 ? (
              <p className="muted text-sm">No activity yet.</p>
            ) : (
              <ol className="timeline" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {activity.map((a) => (
                  <li key={a.id} className="timeline-item">
                    <span className="timeline-dot" aria-hidden />
                    <div>
                      <div className="timeline-text">{describeActivity(a)}</div>
                      <div className="timeline-time" title={format(parseISO(a.created_at), 'PPpp')}>
                        {formatDistanceToNow(parseISO(a.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </>,
    document.body,
  );
}

function describeActivity(a: ActivityEntry) {
  switch (a.kind) {
    case 'created':
      return <>Task created</>;
    case 'status':
      return (
        <>
          Status: <strong>{STATUS_LABEL[(a.from_value ?? 'todo') as Status]}</strong> →{' '}
          <strong>{STATUS_LABEL[(a.to_value ?? 'todo') as Status]}</strong>
        </>
      );
    case 'title':
      return (
        <>
          Renamed to <strong>{a.to_value}</strong>
        </>
      );
    case 'description':
      return <>Description updated</>;
    case 'priority':
      return (
        <>
          Priority: <strong>{a.from_value ?? '—'}</strong> → <strong>{a.to_value ?? '—'}</strong>
        </>
      );
    case 'due_date':
      return (
        <>
          Due date: <strong>{a.from_value || 'none'}</strong> → <strong>{a.to_value || 'none'}</strong>
        </>
      );
    case 'assignee':
      return (
        <>
          Assignee: <strong>{a.from_value || 'Unassigned'}</strong> →{' '}
          <strong>{a.to_value || 'Unassigned'}</strong>
        </>
      );
    default:
      return <>{a.kind}</>;
  }
}
