import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../utils/api';
import usePolling from '../utils/usePolling';
import AuthImage from './AuthImage';
import Icon from './Icon';

const Selfie = ({ imageId, label }) => (
  imageId ? <AuthImage imageId={imageId} alt={label} className="selfie-thumb" /> : null
);

// The organizer's validation queue and voter list for one session
const VotersTab = ({ election, onChanged }) => {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [emails, setEmails] = useState('');
  const [busy, setBusy] = useState('');
  const base = `/elections/${election._id}/manage`;
  const closed = election.status === 'closed';

  const load = useCallback(async () => {
    try {
      const response = await api.get(`${base}/voters`);
      setVoters(response.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Failed to load voters.'));
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  // New join requests show up without refreshing the page
  usePolling(load, 5000, !closed);

  // Runs one organizer action, then refreshes the list and the session counts
  const run = async (key, action, successMessage) => {
    setBusy(key);
    try {
      const response = await action();
      const message = typeof successMessage === 'function' ? successMessage(response.data) : successMessage;
      if (message) toast.success(message);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy('');
      load();
      onChanged();
    }
  };

  const approve = (voter) => run(voter._id, () => api.post(`${base}/voters/${voter._id}/approve`));
  const reject = (voter) => {
    const who = voter.name || voter.email;
    if (voter.status === 'approved' && !window.confirm(`Remove ${who} from this session? They will not be able to vote.`)) {
      return;
    }
    run(voter._id, () => api.post(`${base}/voters/${voter._id}/reject`));
  };
  const approveAll = () => run('all', () => api.post(`${base}/voters/approve-all`), (result) =>
    result.full
      ? `Approved ${result.approved}. The session is now full; ${result.remaining} still waiting.`
      : `Approved ${result.approved} voter${result.approved === 1 ? '' : 's'}.`);

  const addEmails = (e) => {
    e.preventDefault();
    run('emails', () => api.post(`${base}/allow-list`, { emails }), (result) => {
      setEmails('');
      const skipped = result.invalid.length > 0 ? ` Skipped ${result.invalid.length} that are not valid emails.` : '';
      return `Added ${result.added} email${result.added === 1 ? '' : 's'}; approved ${result.autoApproved} who were waiting.${skipped}`;
    });
  };

  const purgeSelfies = () => {
    if (!window.confirm('Delete every selfie and all face data for this session? This cannot be undone.')) return;
    run('purge', () => api.post(`${base}/purge-selfies`), (result) => `Deleted ${result.deleted} selfie${result.deleted === 1 ? '' : 's'}.`);
  };

  if (loading) return <div className="loading">Loading voters...</div>;

  const term = search.trim().toLowerCase();
  const matches = (voter) => !term || voter.name.toLowerCase().includes(term) || voter.email.toLowerCase().includes(term);
  const pending = voters.filter((v) => v.status === 'pending' && matches(v));
  const approved = voters.filter((v) => v.status === 'approved' && matches(v));
  const rejected = voters.filter((v) => v.status === 'rejected' && matches(v));
  const full = election.approvedCount >= election.maxVoters;
  const hasSelfies = voters.some((v) => v.enrolSelfie || v.voteSelfie);

  return (
    <div className="voters-tab">
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <p className="session-stats">
        <strong>{election.approvedCount}</strong> of {election.maxVoters} places taken
        {full && ' · the session is full'}
      </p>

      {!closed && (
        <form className="admin-section" onSubmit={addEmails}>
          <h3>Voter list</h3>
          <p className="form-hint">
            {election.allowList.length} email{election.allowList.length === 1 ? '' : 's'} on the list.
            People on it are approved automatically when they join, so you only have to approve everyone else.
          </p>
          <div className="form-group">
            <label htmlFor="emails">Add emails</label>
            <textarea
              id="emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={3}
              placeholder="One per line, or separated by commas"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy === 'emails' || !emails.trim()}>
            <Icon name="plus" />
            {busy === 'emails' ? 'Adding...' : 'Add to list'}
          </button>
        </form>
      )}

      <div className="form-group voter-search">
        <label htmlFor="voter-search" className="sr-only">Search voters</label>
        <input
          type="search"
          id="voter-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
        />
      </div>

      {!closed && (
        <div className="admin-section">
          <div className="section-header">
            <h3>Waiting for approval ({pending.length})</h3>
            {pending.length > 1 && (
              <button type="button" className="btn btn-success btn-sm" onClick={approveAll} disabled={busy === 'all' || full}>
                {busy === 'all' ? 'Approving...' : `Approve all ${pending.length}`}
              </button>
            )}
          </div>
          {pending.length === 0 ? (
            <div className="empty-panel">
              <Icon name="users" size={26} />
              <p>Nobody is waiting. New requests appear here on their own.</p>
            </div>
          ) : (
            pending.map((voter) => (
              <div key={voter._id} className="voter-row">
                <Selfie imageId={voter.enrolSelfie} label={`Selfie of ${voter.name}`} />
                <div className="voter-identity">
                  <strong>{voter.name || '(no name)'}</strong>
                  <span>{voter.email}</span>
                </div>
                <div className="voter-actions">
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => approve(voter)}
                    disabled={busy === voter._id || full}
                    aria-label={'Approve ' + (voter.name || voter.email)}
                  >
                    <Icon name="check" />
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => reject(voter)}
                    disabled={busy === voter._id}
                    aria-label={'Reject ' + (voter.name || voter.email)}
                  >
                    <Icon name="x" />
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
          {full && pending.length > 0 && (
            <p className="form-hint">The session is full. Raise the voter limit on the Share tab to approve more people.</p>
          )}
        </div>
      )}

      <div className="admin-section">
        <h3>Approved ({approved.length})</h3>
        {approved.length === 0 ? (
          <div className="empty-panel">
            <Icon name="users" size={26} />
            <p>No approved voters yet.</p>
          </div>
        ) : (
          approved.map((voter) => (
            <div key={voter._id} className="voter-row">
              <Selfie imageId={voter.enrolSelfie} label={`Joining selfie of ${voter.name}`} />
              <Selfie imageId={voter.voteSelfie} label={`Voting selfie of ${voter.name}`} />
              <div className="voter-identity">
                <strong>{voter.name || '(no name)'}</strong>
                <span>{voter.email}</span>
              </div>
              <div className="voter-actions">
                <span className="muted">{voter.approvedVia === 'list' ? 'On your list' : 'Approved by you'}</span>
                {voter.hasVoted ? (
                  <span className="voted-mark"><Icon name="check" size={15} strokeWidth={3} />Voted</span>
                ) : (
                  !closed && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => reject(voter)} disabled={busy === voter._id}>
                      Remove
                    </button>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {rejected.length > 0 && (
        <div className="admin-section">
          <h3>Rejected ({rejected.length})</h3>
          {rejected.map((voter) => (
            <div key={voter._id} className="voter-row">
              <div className="voter-identity">
                <strong>{voter.name || '(no name)'}</strong>
                <span>{voter.email}</span>
              </div>
              {!closed && (
                <div className="voter-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => approve(voter)} disabled={busy === voter._id || full}>
                    Approve after all
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {closed && hasSelfies && (
        <div className="admin-section">
          <h3>Selfies</h3>
          <p className="form-hint">Once any disputes are settled, delete the selfies and face data so they are not kept longer than needed.</p>
          <button type="button" className="btn btn-danger btn-sm" onClick={purgeSelfies} disabled={busy === 'purge'}>
            <Icon name="trash" />
            {busy === 'purge' ? 'Deleting...' : 'Delete all selfies'}
          </button>
        </div>
      )}
    </div>
  );
};

export default VotersTab;
