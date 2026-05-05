import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import { AuthContext, type AuthStatus, type AuthValue } from './authContext';

interface InternalState {
  status: AuthStatus;
  user: User | null;
  configError: string | null;
}

function deriveDisplay(user: User | null): { isGuest: boolean; username: string | null } {
  if (!user) return { isGuest: false, username: null };
  // Supabase marks anon users with is_anonymous: true.
  const isGuest = Boolean((user as User & { is_anonymous?: boolean }).is_anonymous);
  if (isGuest) return { isGuest: true, username: 'Guest' };
  const meta = (user.user_metadata ?? {}) as { username?: string };
  if (typeof meta.username === 'string' && meta.username.trim()) {
    return { isGuest: false, username: meta.username.trim() };
  }
  if (user.email) return { isGuest: false, username: user.email.split('@')[0] };
  return { isGuest: false, username: 'You' };
}

function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    // Common Supabase auth errors → friendlier text.
    if (msg.includes('Invalid login credentials')) return 'Wrong email or password.';
    if (msg.toLowerCase().includes('user already registered')) return 'That email is already in use.';
    if (msg.toLowerCase().includes('email rate limit')) return 'Too many attempts — try again in a minute.';
    return msg;
  }
  return 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InternalState>({
    status: 'loading',
    user: null,
    configError: null,
  });

  useEffect(() => {
    if (!hasSupabaseConfig) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({
        status: 'misconfigured',
        user: null,
        configError:
          'Supabase env vars are missing. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      });
      return;
    }

    let mounted = true;

    async function bootstrap() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        if (data.session?.user) {
          setState({ status: 'authed', user: data.session.user, configError: null });
        } else {
          setState({ status: 'signedOut', user: null, configError: null });
        }
      } catch (err) {
        if (!mounted) return;
        setState({
          status: 'misconfigured',
          user: null,
          configError: err instanceof Error ? err.message : 'Could not reach auth service.',
        });
      }
    }

    void bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      if (!mounted) return;
      if (session?.user) {
        setState({ status: 'authed', user: session.user, configError: null });
      } else {
        setState({ status: 'signedOut', user: null, configError: null });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(
    async ({ email, password, username }: { email: string; password: string; username: string }) => {
      try {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: username.trim() } },
        });
        if (error) throw error;
        return { ok: true };
      } catch (err) {
        return { ok: false, error: friendlyError(err) };
      }
    },
    [],
  );

  const signInWithPassword = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        return { ok: true };
      } catch (err) {
        return { ok: false, error: friendlyError(err) };
      }
    },
    [],
  );

  const signInAsGuest = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      return { ok: true };
    } catch (err) {
      return { ok: false, error: friendlyError(err) };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthValue>(() => {
    const { isGuest, username } = deriveDisplay(state.user);
    return {
      status: state.status,
      user: state.user,
      isGuest,
      username,
      configError: state.configError,
      signUp,
      signInWithPassword,
      signInAsGuest,
      signOut,
    };
  }, [state, signUp, signInWithPassword, signInAsGuest, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
