import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/ToastProvider';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import BoardPage from './pages/BoardPage';

function BootLoader() {
  return (
    <div className="app">
      <div className="center-screen">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <img
            src="/brand-mark.png"
            alt=""
            aria-hidden
            width={72}
            height={72}
            className="brand-mark"
            style={{ animation: 'pulse 1.5s infinite ease-in-out' }}
          />
          <span className="muted">Loading…</span>
        </div>
      </div>
    </div>
  );
}

function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <div className="app">
      <div className="center-screen">
        <div className="empty">
          <h2>Setup needed</h2>
          <p>{message}</p>
          <p className="muted text-sm">
            Create a <code>.env</code> file in <code>task-board/</code> based on{' '}
            <code>.env.example</code> and restart the dev server.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Allows children only when authenticated; otherwise routes to '/'. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { status, configError } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <BootLoader />;
  if (status === 'misconfigured') return <ConfigErrorScreen message={configError ?? 'Auth misconfigured.'} />;
  if (status !== 'authed') return <Navigate to="/" state={{ from: location }} replace />;
  return <>{children}</>;
}

/** Public pages that authed users should not see — redirects to '/board'. */
function PublicOnly({ children }: { children: ReactNode }) {
  const { status, configError } = useAuth();
  if (status === 'loading') return <BootLoader />;
  if (status === 'misconfigured') return <ConfigErrorScreen message={configError ?? 'Auth misconfigured.'} />;
  if (status === 'authed') return <Navigate to="/board" replace />;
  return <>{children}</>;
}

/** Three softly-floating tinted blobs that sit behind everything. */
function BackgroundBlobs() {
  return (
    <div className="bg-blobs" aria-hidden>
      <div className="bg-blob bg-blob--violet" />
      <div className="bg-blob bg-blob--pink" />
      <div className="bg-blob bg-blob--sky" />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BackgroundBlobs />
      <Routes>
        <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
        <Route path="/board" element={<RequireAuth><BoardPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
