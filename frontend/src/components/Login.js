import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import Icon from './Icon';

const RESEND_WAIT_SECONDS = 60;

const Login = () => {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Go back to where the user came from (for example a join link), but only within this site
  const requested = searchParams.get('next') || '';
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard';
  // Arriving from a join link: tell the server which session, so the email can name it
  const joinCode = (next.match(/^\/join\/([A-Za-z0-9]+)$/) || [])[1];

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  if (user) return <Navigate to={next} replace />;

  const requestCode = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/request-code', { email, joinCode });
      setStep('code');
      setCode('');
      setResendIn(RESEND_WAIT_SECONDS);
    } catch (err) {
      if (err.response?.status === 429 && err.response.data?.retryAfterSeconds) {
        // A code was sent moments ago: let them enter it
        setStep('code');
        setResendIn(err.response.data.retryAfterSeconds);
      }
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/verify-code', { email, code });
      signIn(response.data.token, response.data.user);
      navigate(next, { replace: true });
    } catch (err) {
      const left = err.response?.data?.attemptsLeft;
      setError(left !== undefined ? `Wrong code. ${left} attempt${left === 1 ? '' : 's'} left.` : errorMessage(err));
      setLoading(false);
    }
  };

  if (step === 'email') {
    return (
      <div className="login-container">
        <h2>Sign in</h2>
        <p className="form-hint">We will email you a 6-digit code. No password needed.</p>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <form onSubmit={(e) => { e.preventDefault(); requestCode(); }}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            <Icon name="mail" />
            {loading ? 'Sending...' : 'Send code'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="login-container">
      <h2>Enter your code</h2>
      <p className="form-hint">We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.</p>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <form onSubmit={verifyCode}>
        <div className="form-group">
          <label htmlFor="code">6-digit code</label>
          <input
            type="text"
            id="code"
            name="code"
            className="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            autoFocus
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading || code.length !== 6}>
          {loading ? 'Checking...' : 'Sign in'}
        </button>
      </form>
      <div className="login-links">
        <button type="button" className="btn-link" onClick={requestCode} disabled={loading || resendIn > 0}>
          {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
        </button>
        <button type="button" className="btn-link" onClick={() => { setStep('email'); setError(''); }}>
          Use a different email
        </button>
      </div>
    </div>
  );
};

export default Login;
