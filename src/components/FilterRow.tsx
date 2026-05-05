import type { Label, Priority, TeamMember } from '../lib/types';
import { PRIORITY_LABEL } from '../lib/types';

interface Props {
  members: TeamMember[];
  labels: Label[];
  priorityFilter: Set<Priority>;
  onTogglePriority: (p: Priority) => void;
  assigneeFilter: string | 'all' | 'unassigned';
  onAssigneeFilter: (v: string | 'all' | 'unassigned') => void;
  labelFilter: Set<string>;
  onToggleLabel: (id: string) => void;
  onClear: () => void;
  hasFilters: boolean;
}

export function FilterRow({
  members,
  labels,
  priorityFilter,
  onTogglePriority,
  assigneeFilter,
  onAssigneeFilter,
  labelFilter,
  onToggleLabel,
  onClear,
  hasFilters,
}: Props) {
  return (
    <div className="filter-row" role="group" aria-label="Filters">
      <span className="filter-label">Priority</span>
      {(['high', 'normal', 'low'] as Priority[]).map((p) => {
        const active = priorityFilter.has(p);
        return (
          <button
            key={p}
            type="button"
            className={`chip-toggle${active ? ' chip-toggle--active' : ''}`}
            onClick={() => onTogglePriority(p)}
            aria-pressed={active}
          >
            {PRIORITY_LABEL[p]}
          </button>
        );
      })}

      <span className="filter-label" style={{ marginLeft: 12 }}>Assignee</span>
      <select
        className="chip-toggle"
        value={assigneeFilter}
        onChange={(e) => onAssigneeFilter(e.target.value as string | 'all' | 'unassigned')}
        style={{ paddingRight: 24 }}
        aria-label="Filter by assignee"
      >
        <option value="all">All</option>
        <option value="unassigned">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      {labels.length > 0 ? (
        <>
          <span className="filter-label" style={{ marginLeft: 12 }}>Labels</span>
          {labels.map((l) => {
            const active = labelFilter.has(l.id);
            return (
              <button
                key={l.id}
                type="button"
                className={`chip-toggle${active ? ' chip-toggle--active' : ''}`}
                onClick={() => onToggleLabel(l.id)}
                aria-pressed={active}
              >
                <span className="chip-dot" style={{ background: l.color }} />
                {l.name}
              </button>
            );
          })}
        </>
      ) : null}

      {hasFilters ? (
        <button type="button" className="filter-clear" onClick={onClear}>
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
