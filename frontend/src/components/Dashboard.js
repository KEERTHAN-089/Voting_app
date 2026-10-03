import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import usePolling from '../utils/usePolling';
import Icon from './Icon';

export const STATUS_LABELS = { draft: 'Not started', open: 'Voting open', closed: 'Closed' };

export const StatusBadge = ({ status }) => (
  <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status}</span>
);

// What a voter can do next in a session they joined
const VoterAction = ({ session }) => {
  const canSeeResults = session.resultsVisible === 'live' || session.status === 'closed';
  const resultsLink = canSeeResults && (
    <Link to={`/elections/${session._id}/results`} className="btn btn-sm btn-secondary">View results</Link>
  );

  if (session.membershipStatus === 'pending') {
    return <Link to={`/join/${session.joinCode}`} className="btn btn-sm btn-secondary">Waiting for approval</Link>;
  }
  if (session.membershipStatus === 'rejected') {
    return <span className="muted">The organizer did not approve you</span>;
  }
  if (session.hasVoted) {
    return (
      <>
        <span className="voted-mark"><Icon name="check" size={15} strokeWidth={3} />You voted</span>
        {resultsLink}
      </>
    );
  }
  if (session.status === 'open') {
    return <Link to={`/elections/${session._id}/vote`} className="btn btn-sm btn-primary">Vote now</Link>;
  }
  if (session.status === 'draft') {
    return <span className="muted">Approved. Voting has not started yet.</span>;
  }
  return resultsLink || <span className="muted">Voting has closed</span>;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [organizing, setOrganizing] = useState([]);
  const [voting, setVoting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [organizingResponse, votingResponse] = await Promise.all([
        api.get('/elections/organizing'),
        api.get('/elections/voting')
      ]);
      setOrganizing(organizingResponse.data);
      setVoting(votingResponse.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Failed to load your sessions.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keeps turnout and the pending badge current while the page is open
  usePolling(load, 10000);

  if (loading) {
    return <div className="loading">Loading your sessions...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-greeting">
        <h1>Welcome, {user.name}</h1>
        <p>Everything you are running or voting in, in one place.</p>
      </div>
      {error && (
        <div className="alert alert-danger" role="alert">
          <Icon name="alertCircle" />
          <div>{error}</div>
        </div>
      )}

      <section className="session-section">
        <div className="section-header">
          <h2>Sessions I run</h2>
          <Link to="/create" className="btn btn-sm btn-primary">
            <Icon name="plus" />
            Create a voting session
          </Link>
        </div>
        {organizing.length === 0 ? (
          <div className="empty-panel">
            <Icon name="ballot" size={28} />
            <p>You have not created a voting session yet. Creating one takes about a minute.</p>
            <Link to="/create" className="btn btn-sm btn-primary">
              <Icon name="plus" />
              Create your first session
            </Link>
          </div>
        ) : (
          <div className="session-grid">
            {organizing.map((session) => (
              <div key={session._id} className="card session-card">
                <div className="session-card-header">
                  <h3>{session.title}</h3>
                  <StatusBadge status={session.status} />
                </div>
                <p className="session-stats">
                  <strong>{session.votedCount}</strong> voted · <strong>{session.approvedCount}</strong> approved · limit {session.maxVoters}
                </p>
                <div className="session-card-actions">
                  <Link to={`/elections/${session._id}/manage`} className="btn btn-sm btn-primary">
                    Manage
                    <Icon name="arrowRight" />
                  </Link>
                  {session.pendingCount > 0 && (
                    <Link to={`/elections/${session._id}/manage?tab=voters`} className="badge badge-pending">
                      {session.pendingCount} waiting for approval
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="session-section">
        <div className="section-header">
          <h2>Sessions I'm voting in</h2>
        </div>
        {voting.length === 0 ? (
          <div className="empty-panel">
            <Icon name="qr" size={28} />
            <p>
              You have not joined a voting session. Scan an organizer&apos;s QR code, or enter a code
              on the <Link to="/">home page</Link>.
            </p>
          </div>
        ) : (
          <div className="session-grid">
            {voting.map((session) => (
              <div key={session._id} className="card session-card">
                <div className="session-card-header">
                  <h3>{session.title}</h3>
                  <StatusBadge status={session.status} />
                </div>
                <div className="session-card-actions">
                  <VoterAction session={session} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
