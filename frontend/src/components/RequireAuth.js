import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api, { errorMessage } from '../utils/api';
import { useAuth } from '../utils/AuthContext';

// Asks a first-time user for their name. Organizers see it when approving voters.
export const NameGate = ({ children }) => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (user.name) return children;

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await api.put('/auth/me', { name });
      setUser(response.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="login-container">
      <h2>What is your name?</h2>
      <p className="form-hint">The organizer sees this when approving voters, so use your real name.</p>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="name"
            autoFocus
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </div>
  );
};

// Sends signed-out visitors to sign-in and brings them back afterwards
const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <NameGate>{children}</NameGate>;
};

export default RequireAuth;
