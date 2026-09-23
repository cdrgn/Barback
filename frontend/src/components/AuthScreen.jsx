import { useState } from 'react';
import { login, register } from '../api/client.js';
import { setToken } from '../api/token.js';

// The gate. Shown when there's no valid session. Toggles between "log in" and
// "sign up" — both hit the backend, both return a token on success. On success
// we store the token and call onAuthed() so App re-renders into the real app.
export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login');   // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isSignup = mode === 'signup'; // to avoid checking mode repeatedly

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const fn = isSignup ? register : login;
      const { token } = await fn(email.trim(), password);
      setToken(token);
      onAuthed();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Barback</h1>
        <p className="app-subtitle">A hand at the bar.</p>
      </header>

      <form className="auth-form" onSubmit={handleSubmit}>
        <p className="section-label">{isSignup ? 'Create an account' : 'Welcome back'}</p>

        {error && <div className="error">{error}</div>}

        <input
          className="auth-input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className="auth-input"
          type="password"
          placeholder={isSignup ? 'Choose a password (8+ characters)' : 'Password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          minLength={isSignup ? 8 : undefined}
          required
        />

        <button className="button" type="submit" disabled={busy || !email.trim() || !password}>
          {busy ? 'One moment…' : isSignup ? 'Sign up' : 'Log in'}
        </button>

        <button
          type="button"
          className="auth-toggle"
          onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError(''); }}
        >
          {isSignup ? 'Already have an account? Log in' : "New here? Create an account"}
        </button>
      </form>
    </div>
  );
}