import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Label, TeamMember } from '../lib/types';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { IconTrash, IconPlus } from './Icons';

const MEMBER_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
  '#84cc16', '#f97316',
];
const LABEL_COLORS = [
  '#64748b', '#0ea5e9', '#7c3aed', '#db2777',
  '#dc2626', '#ea580c', '#ca8a04', '#16a34a',
];

interface Props {
  open: boolean;
  onClose: () => void;
  members: TeamMember[];
  labels: Label[];
  onAddMember: (name: string, color: string) => Promise<void>;
  onRemoveMember: (id: string) => Promise<void>;
  onAddLabel: (name: string, color: string) => Promise<void>;
  onRemoveLabel: (id: string) => Promise<void>;
}

export function TeamModal({
  open,
  onClose,
  members,
  labels,
  onAddMember,
  onRemoveMember,
  onAddLabel,
  onRemoveLabel,
}: Props) {
  const [memberName, setMemberName] = useState('');
  const [memberColor, setMemberColor] = useState(MEMBER_COLORS[0]);
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState(LABEL_COLORS[0]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!memberName.trim()) return;
    await onAddMember(memberName.trim(), memberColor);
    setMemberName('');
  }

  async function addLabel(e: React.FormEvent) {
    e.preventDefault();
    if (!labelName.trim()) return;
    await onAddLabel(labelName.trim(), labelColor);
    setLabelName('');
  }

  return (
    <Modal open={open} title="Team & labels" onClose={onClose} maxWidth={600}>
      <section className="detail-section">
        <h3 className="detail-section-title">Team members</h3>
        {members.length === 0 ? (
          <p className="muted text-sm">No team members yet — add some so you can assign tasks.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {members.map((m) => (
              <li
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--bg-sunken)',
                  border: '1px solid var(--border)',
                  padding: '6px 10px',
                  borderRadius: 'var(--r-md)',
                }}
              >
                <Avatar member={m} />
                <span style={{ color: 'var(--text-strong)' }}>{m.name}</span>
                <span style={{ flex: 1 }} />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={() => onRemoveMember(m.id)}
                  aria-label={`Remove ${m.name}`}
                  title={`Remove ${m.name}`}
                >
                  <IconTrash />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addMember} className="row" style={{ gap: 8, marginTop: 8 }}>
          <input
            className="form-input"
            placeholder="New member name"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            maxLength={60}
          />
          <button type="submit" className="btn btn-primary" disabled={!memberName.trim()}>
            <IconPlus /> Add
          </button>
        </form>
        <div className="swatch-grid" style={{ marginTop: 4 }}>
          {MEMBER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="swatch"
              style={{ background: c }}
              aria-pressed={memberColor === c}
              aria-label={`Color ${c}`}
              onClick={() => setMemberColor(c)}
            />
          ))}
        </div>
      </section>

      <hr className="hr" />

      <section className="detail-section">
        <h3 className="detail-section-title">Labels</h3>
        {labels.length === 0 ? (
          <p className="muted text-sm">No labels yet — try adding "Bug", "Feature", or "Design".</p>
        ) : (
          <div className="label-picker">
            {labels.map((l) => (
              <span
                key={l.id}
                className="pill pill--label"
                style={{ '--label-color': l.color } as CSSProperties}
              >
                {l.name}
                <button
                  type="button"
                  onClick={() => onRemoveLabel(l.id)}
                  aria-label={`Delete ${l.name}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'currentColor',
                    cursor: 'pointer',
                    padding: 0,
                    marginLeft: 2,
                    opacity: 0.7,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <form onSubmit={addLabel} className="row" style={{ gap: 8, marginTop: 8 }}>
          <input
            className="form-input"
            placeholder="New label name"
            value={labelName}
            onChange={(e) => setLabelName(e.target.value)}
            maxLength={40}
          />
          <button type="submit" className="btn btn-primary" disabled={!labelName.trim()}>
            <IconPlus /> Add
          </button>
        </form>
        <div className="swatch-grid" style={{ marginTop: 4 }}>
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="swatch"
              style={{ background: c }}
              aria-pressed={labelColor === c}
              aria-label={`Label color ${c}`}
              onClick={() => setLabelColor(c)}
            />
          ))}
        </div>
      </section>
    </Modal>
  );
}
