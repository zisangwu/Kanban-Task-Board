import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Label, Priority, Status, TeamMember } from '../lib/types';
import { PRIORITY_LABEL, STATUSES, STATUS_LABEL } from '../lib/types';
import { Modal } from './Modal';

export interface NewTaskValues {
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  due_date: string | null;
  assignee_id: string | null;
  label_ids: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NewTaskValues) => Promise<void>;
  members: TeamMember[];
  labels: Label[];
  defaultStatus?: Status;
}

// Public component: the parent should remount this with a key to reset state
// when reopening (we do that in App.tsx).
export function NewTaskModal(props: Props) {
  if (!props.open) return null;
  return <NewTaskModalForm {...props} />;
}

function NewTaskModalForm({ open, onClose, onSubmit, members, labels, defaultStatus = 'todo' }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [priority, setPriority] = useState<Priority>('normal');
  const [dueDate, setDueDate] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the title input shortly after mount.
  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, []);

  function toggleLabel(id: string) {
    setLabelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        due_date: dueDate || null,
        assignee_id: assigneeId || null,
        label_ids: labelIds,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="New task"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="new-task-form"
            className="btn btn-primary"
            disabled={!title.trim() || submitting}
          >
            {submitting ? 'Creating…' : 'Create task'}
          </button>
        </>
      }
    >
      <form id="new-task-form" onSubmit={handleSubmit} className="form-row" style={{ gap: 16 }}>
        <div className="form-row">
          <label className="form-label" htmlFor="t-title">Title</label>
          <input
            ref={inputRef}
            id="t-title"
            className="form-input"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
        </div>

        <div className="form-row">
          <label className="form-label" htmlFor="t-desc">Description</label>
          <textarea
            id="t-desc"
            className="form-textarea"
            placeholder="Add more context (optional)…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-grid-2">
          <div className="form-row">
            <label className="form-label" htmlFor="t-status">Column</label>
            <select id="t-status" className="form-select" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="t-due">Due date</label>
            <input
              id="t-due"
              type="date"
              className="form-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <span className="form-label">Priority</span>
          <div className="priority-toggle" role="group" aria-label="Priority">
            {(['low', 'normal', 'high'] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={priority === p}
                onClick={() => setPriority(p)}
              >
                {PRIORITY_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label className="form-label" htmlFor="t-assign">Assignee</label>
          <select
            id="t-assign"
            className="form-select"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {labels.length > 0 ? (
          <div className="form-row">
            <span className="form-label">Labels</span>
            <div className="label-picker">
              {labels.map((l) => {
                const active = labelIds.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleLabel(l.id)}
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
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
