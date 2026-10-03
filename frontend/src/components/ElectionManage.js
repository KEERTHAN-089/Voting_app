import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';
import api, { errorMessage, imageUrl } from '../utils/api';
import usePolling from '../utils/usePolling';
import CandidateForm from './CandidateForm';
import ElectionForm from './ElectionForm';
import ResultsBoard from './ResultsBoard';
import VotersTab from './VotersTab';
import { StatusBadge } from './Dashboard';
import Icon from './Icon';

const TABS = [
  ['share', 'Share'],
  ['candidates', 'Candidates'],
  ['voters', 'Voters'],
  ['results', 'Results']
];

// Status, the join link and QR code, and the open/close switch
const ShareTab = ({ election, candidateCount, pendingCount, votedCount, onChanged }) => {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const base = `/elections/${election._id}/manage`;
  const joinUrl = `${window.location.origin}/join/${election.joinCode}`;

  const change = async (action, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await api.post(`${base}/${action}`);
      await onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      toast.success('Link copied');
    } catch (err) {
      toast.error('Could not copy. Select the link and copy it by hand.');
    }
  };

  const deleteSession = async () => {
    if (!window.confirm(`Delete "${election.title}" with all its candidates, voters and votes? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.delete(base);
      toast.success('Voting session deleted');
      navigate('/dashboard');
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="admin-section status-panel">
        {election.status === 'draft' && (
          <>
            <p>Voting has not started. Voters can already join with the link below, and you can approve them.</p>
            <button
              type="button"
              className="btn btn-success btn-lg"
              onClick={() => change('open')}
              disabled={busy || candidateCount < 2}
            >
              <Icon name="check" />
              Open voting
            </button>
            {candidateCount < 2 && (
              <p className="form-hint">
                Add at least two candidates on the <Link to="?tab=candidates">Candidates</Link> tab first.
              </p>
            )}
          </>
        )}
        {election.status === 'open' && (
          <>
            <p>Voting is open. Approved voters can cast their vote now.</p>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => change('close', 'Close voting? Nobody will be able to vote after this, and it cannot be reopened.')}
              disabled={busy}
            >
              <Icon name="lock" />
              Close voting
            </button>
          </>
        )}
        {election.status === 'closed' && (
          <p>Voting is closed. See the final count on the <Link to="?tab=results">Results</Link> tab.</p>
        )}

        <p className="session-stats">
          <strong>{votedCount}</strong> voted · <strong>{election.approvedCount}</strong> approved · limit {election.maxVoters}
          {pendingCount > 0 && (
            <> · <Link to="?tab=voters" className="badge badge-pending">{pendingCount} waiting for approval</Link></>
          )}
        </p>
      </div>

      {election.status !== 'closed' && (
        <div className="admin-section share-panel">
          <h3>Invite voters</h3>
          <p className="muted">Show this QR code on a screen, or send the link.</p>
          <div className="qr-box">
            <QRCodeSVG value={joinUrl} size={220} />
          </div>
          <div className="join-code">{election.joinCode}</div>
          <p className="join-link">{joinUrl}</p>
          <div className="form-buttons">
            <button type="button" className="btn btn-primary btn-sm" onClick={copyLink}>
              <Icon name="copy" />
              Copy link
            </button>
          </div>
        </div>
      )}

      <div className="admin-section">
        <h3>Settings</h3>
        {editing ? (
          <ElectionForm
            initialData={election}
            selfieLocked={election.approvedCount + pendingCount > 0}
            onSaved={async () => { await onChanged(); setEditing(false); toast.success('Settings saved'); }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="form-buttons">
            {election.status !== 'closed' && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                <Icon name="pencil" />
                Edit settings
              </button>
            )}
            <button type="button" className="btn btn-danger btn-sm" onClick={deleteSession} disabled={busy}>
              <Icon name="trash" />
              Delete session
            </button>
          </div>
        )}
      </div>
    </>
  );
};

const CandidatesTab = ({ election, candidates, onChanged }) => {
  const [editingCandidate, setEditingCandidate] = useState(null);
  const draft = election.status === 'draft';
  const closed = election.status === 'closed';

  const handleDeleteCandidate = async (candidate) => {
    if (!window.confirm(`Delete ${candidate.name}?`)) return;
    try {
      await api.delete(`/elections/${election._id}/manage/candidates/${candidate._id}`);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete candidate'));
    }
  };

  return (
    <div className="admin-section">
      {editingCandidate ? (
        <div className="edit-candidate-section">
          <h4>Edit Candidate</h4>
          <CandidateForm
            electionId={election._id}
            initialData={editingCandidate}
            onSubmit={() => { setEditingCandidate(null); onChanged(); }}
            onCancel={() => setEditingCandidate(null)}
          />
        </div>
      ) : draft ? (
        <div className="add-candidate-section">
          <h4>Add New Candidate</h4>
          <CandidateForm electionId={election._id} onSubmit={onChanged} />
        </div>
      ) : (
        <div className="alert alert-info">
          <Icon name="info" />
          <div>
            {closed
              ? 'This session is closed, so candidates can no longer be changed.'
              : 'Voting is open, so candidates can no longer be added or removed. You can still fix a name or photo.'}
          </div>
        </div>
      )}

      <div className="candidate-list">
        <h4>Candidates ({candidates.length})</h4>
        {candidates.length === 0 ? (
          <div className="empty-panel">
            <Icon name="users" size={28} />
            <p>No candidates yet. Add your first candidate using the form above.</p>
          </div>
        ) : (
          <div className="table-wrap">
          <table className="candidates-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Group / tagline</th>
                {!closed && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate._id}>
                  <td>
                    {candidate.image ? (
                      <img src={imageUrl(candidate.image)} alt={candidate.name} className="admin-table-image" />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                  </td>
                  <td>{candidate.name}</td>
                  <td>{candidate.party}</td>
                  {!closed && (
                    <td>
                      <div className="row-actions">
                        <button
                          onClick={() => setEditingCandidate(candidate)}
                          className="btn btn-sm btn-secondary"
                          aria-label={`Edit ${candidate.name}`}
                        >
                          <Icon name="pencil" />
                          Edit
                        </button>
                        {draft && (
                          <button
                            onClick={() => handleDeleteCandidate(candidate)}
                            className="btn btn-sm btn-danger"
                            aria-label={`Delete ${candidate.name}`}
                          >
                            <Icon name="trash" />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
};

const ResultsTab = ({ election }) => {
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await api.get(`/elections/${election._id}/results`);
      setResults(response.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Failed to load results.'));
    }
  }, [election._id]);

  // Reload when the status changes too, so closing the session shows the final count at once
  useEffect(() => {
    load();
  }, [load, election.status]);

  usePolling(load, 5000, election.status === 'open');

  const downloadCsv = async () => {
    try {
      const response = await api.get(`/elections/${election._id}/manage/results.csv`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${election.title.replace(/[^a-z0-9]+/gi, '-')}-results.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not download the results.'));
    }
  };

  if (error) return <div className="alert alert-danger" role="alert">{error}</div>;
  if (!results) return <div className="loading">Loading results...</div>;

  return (
    <div className="admin-section">
      {election.status !== 'closed' && election.resultsVisible === 'afterClose' && (
        <div className="alert alert-info">
          <Icon name="lock" />
          <div>Only you can see these numbers until you close the session.</div>
        </div>
      )}
      <ResultsBoard results={results} />
      <div className="results-footer">
        <button type="button" className="btn btn-secondary btn-sm" onClick={downloadCsv}>
          <Icon name="download" />
          Download results (CSV)
        </button>
      </div>
    </div>
  );
};

// The organizer's page for one session
const ElectionManage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const requestedTab = searchParams.get('tab');
  const tab = TABS.some(([key]) => key === requestedTab) ? requestedTab : 'share';

  const load = useCallback(async () => {
    try {
      const response = await api.get(`/elections/${id}/manage`);
      setData(response.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Failed to load this session.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Keeps the turnout numbers and the pending badge current
  usePolling(load, 10000, Boolean(data) && data.election.status !== 'closed');

  if (loading) return <div className="loading">Loading session...</div>;
  if (!data) {
    return (
      <div className="admin-dashboard">
        <div className="alert alert-danger" role="alert">{error}</div>
        <Link to="/dashboard" className="btn btn-primary">
          <Icon name="arrowLeft" />
          Back to my sessions
        </Link>
      </div>
    );
  }

  const { election, candidates, pendingCount, votedCount } = data;

  return (
    <div className="admin-dashboard">
      <div className="manage-header">
        <h2>{election.title}</h2>
        <StatusBadge status={election.status} />
      </div>
      {election.description && <p className="manage-description muted">{election.description}</p>}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`tab ${tab === key ? 'active' : ''}`}
            onClick={() => setSearchParams({ tab: key }, { replace: true })}
          >
            {label}
            {key === 'voters' && pendingCount > 0 && <span className="tab-count">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {tab === 'share' && (
        <ShareTab
          election={election}
          candidateCount={candidates.length}
          pendingCount={pendingCount}
          votedCount={votedCount}
          onChanged={load}
        />
      )}
      {tab === 'candidates' && <CandidatesTab election={election} candidates={candidates} onChanged={load} />}
      {tab === 'voters' && <VotersTab election={election} onChanged={load} />}
      {tab === 'results' && <ResultsTab election={election} />}
    </div>
  );
};

export default ElectionManage;
