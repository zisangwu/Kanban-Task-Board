import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // We surface this in the UI rather than crashing the bundle.
  console.warn(
    '[task-board] Missing Supabase env vars — copy .env.example to .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.',
  );
}

// We don't pass a generated `Database` type here on purpose — we use our own
// hand-written types in src/lib/types.ts and cast at the boundary in
// src/lib/db.ts.  This keeps the surface area small and avoids depending on
// the Supabase CLI to regenerate types.
export const supabase = createClient(url ?? 'http://invalid', anonKey ?? 'invalid', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'task-board-auth',
  },
});

export const hasSupabaseConfig = Boolean(url && anonKey);
