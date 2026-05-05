import { useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

export type AuthState =
  | { status: 'loading'; user: null; error: null }
  | { status: 'ready'; user: User; error: null }
  | { status: 'misconfigured'; user: null; error: string }
  | { status: 'error'; user: null; error: string };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    user: null,
    error: null,
  });
  const signInAttempted = useRef(false);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      // setState in an effect is intentional here: this is one-time auth
      // bootstrap and we need to drive UI from the result.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({
        status: 'misconfigured',
        user: null,
        error:
          'Supabase env vars are missing. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      });
      return;
    }

    let mounted = true;

    async function bootstrap() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data.session?.user) {
          if (mounted) setState({ status: 'ready', user: data.session.user, error: null });
          return;
        }

        if (signInAttempted.current) return;
        signInAttempted.current = true;

        const { data: anon, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw signInError;
        if (!anon.user) throw new Error('No user returned from anonymous sign-in');
        if (mounted) setState({ status: 'ready', user: anon.user, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sign in.';
        if (mounted) setState({ status: 'error', user: null, error: message });
      }
    }

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      if (!mounted) return;
      if (session?.user) {
        setState({ status: 'ready', user: session.user, error: null });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
