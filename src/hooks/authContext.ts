import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';

export type AuthStatus = 'loading' | 'misconfigured' | 'authed' | 'signedOut';

export interface AuthValue {
  status: AuthStatus;
  user: User | null;
  /** True when the current user came from anonymous sign-in. */
  isGuest: boolean;
  /** Display name (user_metadata.username, or email local-part, or "Guest"). */
  username: string | null;
  /** A single human-readable string set when status is 'misconfigured'. */
  configError: string | null;

  signUp(args: {
    email: string;
    password: string;
    username: string;
  }): Promise<{ ok: boolean; error?: string }>;
  signInWithPassword(args: {
    email: string;
    password: string;
  }): Promise<{ ok: boolean; error?: string }>;
  signInAsGuest(): Promise<{ ok: boolean; error?: string }>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);
