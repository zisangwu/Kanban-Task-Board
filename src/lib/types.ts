export type Status = 'todo' | 'in_progress' | 'in_review' | 'done';
export type Priority = 'low' | 'normal' | 'high';

export const STATUSES: Status[] = ['todo', 'in_progress', 'in_review', 'done'];

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

export interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Label {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  due_date: string | null;
  assignee_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskLabel {
  task_id: string;
  label_id: string;
  user_id: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export type ActivityKind =
  | 'created'
  | 'status'
  | 'title'
  | 'description'
  | 'priority'
  | 'due_date'
  | 'assignee';

export interface ActivityEntry {
  id: string;
  task_id: string;
  user_id: string;
  kind: ActivityKind;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
}

