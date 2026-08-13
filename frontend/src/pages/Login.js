import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../App';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ username: 'admin', password: 'Admin@123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      signIn(data.data);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-bg" />
      <div className="login-shade" />
      <div className="login-grid" />

      <section className="login-stage" aria-label="MedCore HMS sign in">
        <div className="login-showcase">
          <div className="brand-lockup">
            <div className="brand-mark">+</div>
            <div>
              <div className="brand-name">MedCore HMS</div>
              <div className="brand-sub">Hospital Management System</div>
            </div>
          </div>

          <div className="hero-copy">
            <span className="hero-kicker">Care operations console</span>
            <h1>Smart hospital control, ready for every shift.</h1>
            <p>
              Admissions, doctors, beds, billing, pharmacy, and lab reports come together
              in one calm clinical workspace.
            </p>
          </div>

          <div className="login-insights" aria-hidden="true">
            <div>
              <strong>10</strong>
              <span>patients loaded</span>
            </div>
            <div>
              <strong>8</strong>
              <span>doctors ready</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>hospital access</span>
            </div>
          </div>
        </div>

        <div className="login-card-wrap">
          <form className="login-card" onSubmit={submit}>
            <div className="form-head">
              <span className="form-badge">Secure access</span>
              <h2>Sign in</h2>
              <p>Use your hospital admin credentials.</p>
            </div>

            <label className="login-field">
              <span>Username</span>
              <input
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="Enter username"
                autoComplete="username"
                required
              />
            </label>

            <label className="login-field">
              <span>Password</span>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </label>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-submit" disabled={loading}>
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <b>{loading ? '...' : '->'}</b>
            </button>

            <div className="credential-strip">
              <span>Default</span>
              <strong>admin</strong>
              <i>/</i>
              <strong>Admin@123</strong>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
