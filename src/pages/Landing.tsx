import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const FEATURES = [
  'Drag-and-drop columns',
  'Realtime sync across devices',
  'Comments, labels & due dates',
  'Private to you',
];

export default function Landing() {
  const { signInAsGuest, status } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuest() {
    setError(null);
    setBusy(true);
    const result = await signInAsGuest();
    setBusy(false);
    if (result.ok) {
      navigate('/board', { replace: true });
    } else {
      setError(result.error ?? 'Could not start a guest session.');
    }
  }

  const bootLoading = status === 'loading';

  return (
    <div className="auth-page landing-page">
      <span className="landing-shape landing-shape--rect" aria-hidden />
      <span className="landing-shape landing-shape--circle" aria-hidden />
      <main className="landing-hero" role="main">
        <img
          className="brand-mark landing-mark"
          src="/brand-mark.png"
          alt=""
          aria-hidden
          width={120}
          height={120}
        />
        <h1 className="landing-title">
          Plan your work,
          <br />
          finish what matters.
        </h1>
        <p className="landing-tagline">
          A Kanban board built to help you manage tasks and stay focused. Sign up to keep your
          board across devices, or jump in as a guest.
        </p>

        <ul className="landing-features" aria-label="Features">
          {FEATURES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>

        <div className="landing-ctas">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleGuest}
            disabled={busy || bootLoading}
          >
            {busy ? 'Starting…' : 'Try as guest'}
          </button>
          <Link to="/signup" className="btn btn-secondary btn-lg">
            Create account
          </Link>
          <Link to="/login" className="btn btn-ghost btn-lg">
            Log in
          </Link>
        </div>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <p className="landing-foot muted text-sm">
          Guest accounts are temporary and tied to this browser. Create an account to keep your
          tasks safe.
        </p>
      </main>
    </div>
  );
}
