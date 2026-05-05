import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const MIN_PASSWORD = 6;

export default function Signup() {
  const { signUp, signInWithPassword } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const u = username.trim();
    if (u.length < 2) {
      setError('Choose a username with at least 2 characters.');
      return;
    }
    if (!email.trim()) {
      setError('Enter an email address.');
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setBusy(true);
    const signed = await signUp({ email, password, username: u });
    if (!signed.ok) {
      setBusy(false);
      setError(signed.error ?? 'Could not create your account.');
      return;
    }

    // Try logging in straight away. If email confirmation is required in
    // Supabase, this will fail gracefully — fall back to a friendly notice.
    const logged = await signInWithPassword({ email, password });
    setBusy(false);
    if (logged.ok) {
      navigate('/board', { replace: true });
    } else {
      setError(
        'Account created. Confirm your email to finish — then come back and log in.',
      );
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-card" role="main">
        <Link to="/" className="auth-back" aria-label="Back to home">
          ← Home
        </Link>
        <img className="brand-mark auth-mark" src="/brand-mark.png" alt="" aria-hidden width={64} height={64} />
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Keep your tasks across devices.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="form-label">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={32}
              required
              autoFocus
            />
          </label>
          <label className="form-label">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="form-label">
            <span>Password</span>
            <input
              type="password"
              autoComplete="new-password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MIN_PASSWORD}
              required
            />
            <span className="form-hint">At least {MIN_PASSWORD} characters.</span>
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="auth-link-row">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </main>
    </div>
  );
}
