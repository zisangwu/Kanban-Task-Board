import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task, TeamMember } from '../lib/types';
import { IconLogout, IconPlus, IconSearch, IconUsers } from './Icons';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useAuth } from '../hooks/useAuth';

interface Props {
  tasks: Task[];
  members: TeamMember[];
  query: string;
  onQuery: (q: string) => void;
  onNewTask: () => void;
  onOpenTeam: () => void;
}

export function Header({ tasks, members, query, onQuery, onNewTask, onOpenTeam }: Props) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const overdue = tasks.filter(
    (t) =>
      t.due_date &&
      t.status !== 'done' &&
      differenceInCalendarDays(parseISO(t.due_date), new Date()) < 0,
  ).length;

  const { username, isGuest, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    if (isGuest) {
      const ok = window.confirm(
        'Logging out of a guest account will permanently delete your tasks. Continue?',
      );
      if (!ok) return;
    }
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    navigate('/', { replace: true });
  }

  return (
    <header className="app-header">
      <div className="brand">
        <img className="brand-mark" src="/brand-mark.png" alt="" aria-hidden width={72} height={72} />
        <div>
          <div className="brand-name">Kanban Board</div>
          <div className="brand-sub" title={isGuest ? 'Guest session' : (username ?? '')}>
            {isGuest ? 'Guest · ' : ''}
            {username ?? '…'}
          </div>
        </div>
      </div>

      <div className="header-stats" role="group" aria-label="Board summary">
        <div className="stat">
          <span className="stat-label">Total</span>
          <span className="stat-value">{total}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Done</span>
          <span className={`stat-value${total > 0 && done === total ? ' stat-value--good' : ''}`}>
            {done}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Overdue</span>
          <span className={`stat-value${overdue > 0 ? ' stat-value--alert' : ''}`}>{overdue}</span>
        </div>
      </div>

      <div className="header-actions">
        <div className="search">
          <IconSearch className="search-icon" />
          <input
            type="search"
            placeholder="Search tasks…"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            aria-label="Search tasks"
          />
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onOpenTeam}
          title={members.length ? `${members.length} team members` : 'Add team members'}
        >
          <IconUsers /> Team {members.length ? `(${members.length})` : ''}
        </button>
        <button type="button" className="btn btn-primary" onClick={onNewTask}>
          <IconPlus /> New task
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={handleSignOut}
          disabled={signingOut}
          title={isGuest ? 'End guest session' : 'Log out'}
          aria-label={isGuest ? 'End guest session' : 'Log out'}
        >
          <IconLogout />
        </button>
      </div>
    </header>
  );
}
