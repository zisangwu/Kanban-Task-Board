import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { signInWithPassword, signInAsGuest } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    const result = await signInWithPassword({ email, password });
    setBusy(false);
    if (result.ok) {
      navigate('/board', { replace: true });
    } else {
      setError(result.error ?? 'Could not sign in.');
    }
  }

  async function handleGuest() {
    setError(null);
    setGuestBusy(true);
    const result = await signInAsGuest();
    setGuestBusy(false);
    if (result.ok) {
      navigate('/board', { replace: true });
    } else {
      setError(result.error ?? 'Could not start a guest session.');
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-card" role="main">
        <Link to="/" className="auth-back" aria-label="Back to home">
          ← Home
        </Link>
        <img className="brand-mark auth-mark" src="/brand-mark.png" alt="" aria-hidden width={64} height={64} />
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Log in to your Kanban board.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="form-label">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="form-label">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <button
          type="button"
          className="btn btn-ghost btn-lg auth-secondary"
          onClick={handleGuest}
          disabled={guestBusy}
        >
          {guestBusy ? 'Starting…' : 'Continue as guest'}
        </button>

        <p className="auth-link-row">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </main>
    </div>
  );
}
