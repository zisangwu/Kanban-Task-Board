import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  fetchLabels,
  fetchTaskLabels,
  fetchTasks,
  fetchTeamMembers,
} from '../lib/db';
import type { Label, Task, TaskLabel, TeamMember } from '../lib/types';

export interface BoardData {
  tasks: Task[];
  members: TeamMember[];
  labels: Label[];
  taskLabels: TaskLabel[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  // Optimistic helpers used by the UI when mutating data.
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  setLabels: React.Dispatch<React.SetStateAction<Label[]>>;
  setTaskLabels: React.Dispatch<React.SetStateAction<TaskLabel[]>>;
}

export function useBoardData(userId: string | null): BoardData {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [taskLabels, setTaskLabels] = useState<TaskLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelsRef = useRef<RealtimeChannel[]>([]);

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      setError(null);
      const [t, m, l, tl] = await Promise.all([
        fetchTasks(userId),
        fetchTeamMembers(userId),
        fetchLabels(userId),
        fetchTaskLabels(userId),
      ]);
      setTasks(t);
      setMembers(m);
      setLabels(l);
      setTaskLabels(tl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial load + reload on user change.  We flip `loading` here on purpose
  // so the UI shows the skeleton during the very first fetch.
  useEffect(() => {
    if (!userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void reload();
  }, [userId, reload]);

  // Realtime subscriptions.  We listen for changes on rows belonging to this
  // user and reconcile them into local state.  Reload is the simplest correct
  // strategy and keeps the code small.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`board:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        () => {
          void reload();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members', filter: `user_id=eq.${userId}` },
        () => {
          void reload();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'labels', filter: `user_id=eq.${userId}` },
        () => {
          void reload();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_labels', filter: `user_id=eq.${userId}` },
        () => {
          void reload();
        },
      )
      .subscribe();

    channelsRef.current.push(channel);

    return () => {
      void supabase.removeChannel(channel);
      channelsRef.current = channelsRef.current.filter((c) => c !== channel);
    };
  }, [userId, reload]);

  return useMemo(
    () => ({
      tasks,
      members,
      labels,
      taskLabels,
      loading,
      error,
      reload,
      setTasks,
      setMembers,
      setLabels,
      setTaskLabels,
    }),
    [tasks, members, labels, taskLabels, loading, error, reload],
  );
}
