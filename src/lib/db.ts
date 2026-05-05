import { supabase } from './supabase';
import type {
  ActivityEntry,
  ActivityKind,
  Comment,
  Label,
  Priority,
  Status,
  Task,
  TaskLabel,
  TeamMember,
} from './types';

// =====================================================================
// Tasks
// =====================================================================

export async function fetchTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string | null;
  priority?: Priority;
  status?: Status;
  due_date?: string | null;
  assignee_id?: string | null;
  position: number;
  labelIds?: string[];
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { userId, labelIds, ...rest } = input;
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: rest.title,
      description: rest.description ?? null,
      priority: rest.priority ?? 'normal',
      status: rest.status ?? 'todo',
      due_date: rest.due_date ?? null,
      assignee_id: rest.assignee_id ?? null,
      position: rest.position,
    })
    .select('*')
    .single();
  if (error) throw error;
  const task = data as Task;

  if (labelIds && labelIds.length) {
    const rows = labelIds.map((label_id) => ({ task_id: task.id, label_id, user_id: userId }));
    const { error: lblErr } = await supabase.from('task_labels').insert(rows);
    if (lblErr) throw lblErr;
  }

  await logActivity({ task_id: task.id, user_id: userId, kind: 'created', to_value: task.title });
  return task;
}

export async function updateTask(
  taskId: string,
  patch: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'assignee_id' | 'position'>>,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', taskId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

// =====================================================================
// Team members
// =====================================================================

export async function fetchTeamMembers(userId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

export async function createTeamMember(userId: string, name: string, color: string): Promise<TeamMember> {
  const { data, error } = await supabase
    .from('team_members')
    .insert({ user_id: userId, name, color })
    .select('*')
    .single();
  if (error) throw error;
  return data as TeamMember;
}

export async function deleteTeamMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('team_members').delete().eq('id', memberId);
  if (error) throw error;
}

// =====================================================================
// Labels
// =====================================================================

export async function fetchLabels(userId: string): Promise<Label[]> {
  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Label[];
}

export async function createLabel(userId: string, name: string, color: string): Promise<Label> {
  const { data, error } = await supabase
    .from('labels')
    .insert({ user_id: userId, name, color })
    .select('*')
    .single();
  if (error) throw error;
  return data as Label;
}

export async function deleteLabel(labelId: string): Promise<void> {
  const { error } = await supabase.from('labels').delete().eq('id', labelId);
  if (error) throw error;
}

// =====================================================================
// Task <-> Label join
// =====================================================================

export async function fetchTaskLabels(userId: string): Promise<TaskLabel[]> {
  const { data, error } = await supabase.from('task_labels').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as TaskLabel[];
}

export async function setTaskLabels(taskId: string, userId: string, labelIds: string[]): Promise<void> {
  const { error: delErr } = await supabase.from('task_labels').delete().eq('task_id', taskId);
  if (delErr) throw delErr;
  if (!labelIds.length) return;
  const rows = labelIds.map((label_id) => ({ task_id: taskId, label_id, user_id: userId }));
  const { error } = await supabase.from('task_labels').insert(rows);
  if (error) throw error;
}

// =====================================================================
// Comments
// =====================================================================

export async function fetchComments(taskId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Comment[];
}

export async function createComment(taskId: string, userId: string, body: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, user_id: userId, body })
    .select('*')
    .single();
  if (error) throw error;
  return data as Comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}

// =====================================================================
// Activity log
// =====================================================================

export async function fetchActivity(taskId: string): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from('activity')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ActivityEntry[];
}

export async function logActivity(entry: {
  task_id: string;
  user_id: string;
  kind: ActivityKind;
  from_value?: string | null;
  to_value?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('activity').insert({
    task_id: entry.task_id,
    user_id: entry.user_id,
    kind: entry.kind,
    from_value: entry.from_value ?? null,
    to_value: entry.to_value ?? null,
  });
  if (error) throw error;
}
