import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage, imageUrl } from '../utils/api';
import usePolling from '../utils/usePolling';
import SelfieCapture from './SelfieCapture';
import Icon from './Icon';

const VotingPage = () => {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notAllowed, setNotAllowed] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  // 'choose' -> 'confirm' -> 'selfie' (only if the session asks for one)
  const [step, setStep] = useState('choose');
  const [voting, setVoting] = useState(false);
  const navigate = useNavigate();

  const loadBallot = useCallback(async () => {
    try {
      const response = await api.get(`/elections/${id}/ballot`);
      setElection(response.data.election);
      setCandidates(response.data.candidates);
      setHasVoted(response.data.hasVoted);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        setNotAllowed(errorMessage(err));
      } else {
        setError(errorMessage(err, 'Failed to load the ballot. Please try again later.'));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBallot();
  }, [loadBallot]);

  // If voting has not started, keep checking until the organizer opens the session
  usePolling(loadBallot, 5000, election?.status === 'draft');

  const resultsVisible = election && (election.resultsVisible === 'live' || election.status === 'closed');
  const chosen = candidates.find((candidate) => candidate._id === selectedCandidate);

  const submitVote = async (selfie) => {
    try {
      setVoting(true);
      setError('');
      await api.post(`/elections/${id}/vote`, {
        candidateId: selectedCandidate,
        ...(selfie && { selfie: selfie.dataUrl, faceDescriptor: selfie.faceDescriptor })
      });
      setHasVoted(true);
      setVoteSubmitted(true);
      if (election.resultsVisible === 'live') {
        setTimeout(() => navigate(`/elections/${id}/results`), 3000);
      }
    } catch (err) {
      console.error('Error submitting vote:', err);
      if (err.response?.status === 409) {
        // Already voted, or the session is no longer open: reload to show the right state
        setStep('choose');
        await loadBallot();
      }
      setError(errorMessage(err, 'Failed to submit vote. Please try again.'));
    } finally {
      setVoting(false);
    }
  };

  const onConfirm = () => {
    if (election.selfieMode === 'none') submitVote();
    else setStep('selfie');
  };

  if (loading) {
    return (
      <div className="voting-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading ballot...</p>
        </div>
      </div>
    );
  }

  if (notAllowed) {
    return (
      <div className="voting-container">
        <div className="alert alert-danger" role="alert">
          <Icon name="alertCircle" />
          <div>{notAllowed}</div>
        </div>
        <Link to="/dashboard" className="btn btn-primary">
          <Icon name="arrowLeft" />
          Back to my sessions
        </Link>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="voting-container">
        <div className="alert alert-danger" role="alert">
          <Icon name="alertCircle" />
          <div>{error}</div>
        </div>
      </div>
    );
  }

  const renderBody = () => {
    if (voteSubmitted) {
      return (
        <div className="vote-success">
          <div className="check-animation" aria-hidden="true">
            <Icon name="check" size={44} strokeWidth={2.4} />
          </div>
          <h3>Vote submitted</h3>
          <p>Thank you for taking part.</p>
          {election.resultsVisible === 'live'
            ? <p className="muted">Taking you to the results...</p>
            : <p className="muted">Results will be shown when the organizer closes the session.</p>}
        </div>
      );
    }

    if (hasVoted) {
      return (
        <div className="state-panel">
          <span className="state-icon state-icon-success" aria-hidden="true">
            <Icon name="checkCircle" size={26} />
          </span>
          <h3>You have already cast your vote</h3>
          <p>Each voter can only vote once. Thank you for taking part!</p>
          {resultsVisible && (
            <button onClick={() => navigate(`/elections/${id}/results`)} className="btn btn-primary">
              <Icon name="barChart" />
              View results
            </button>
          )}
        </div>
      );
    }

    if (election.status === 'draft') {
      return (
        <div className="state-panel">
          <span className="state-icon" aria-hidden="true"><Icon name="clock" size={26} /></span>
          <h3>Voting has not started yet</h3>
          <p>Keep this page open. The ballot will appear when the organizer opens the session.</p>
        </div>
      );
    }

    if (election.status === 'closed') {
      return (
        <div className="state-panel">
          <span className="state-icon" aria-hidden="true"><Icon name="lock" size={26} /></span>
          <h3>Voting has closed</h3>
          <Link to={`/elections/${id}/results`} className="btn btn-primary">
            <Icon name="barChart" />
            View results
          </Link>
        </div>
      );
    }

    if (step === 'selfie') {
      return (
        <div className="confirm-box">
          <h3>Take a selfie to cast your vote for {chosen.name}</h3>
          <SelfieCapture
            withFace={election.selfieMode === 'faceMatch'}
            onCapture={submitVote}
            onCancel={() => setStep('confirm')}
            busy={voting}
            confirmLabel="Cast my vote"
          />
        </div>
      );
    }

    if (step === 'confirm') {
      return (
        <div className="confirm-box">
          <span className="state-icon" aria-hidden="true"><Icon name="ballot" size={26} /></span>
          <h3>You are voting for {chosen.name}</h3>
          <p className="muted">You can vote only once, and a vote cannot be changed afterwards.</p>
          <div className="form-buttons">
            <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={voting}>
              {voting ? 'Submitting...' : election.selfieMode === 'none' ? 'Cast my vote' : 'Continue'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setStep('choose')} disabled={voting}>
              Go back
            </button>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={(e) => { e.preventDefault(); setError(''); setStep('confirm'); }} className="voting-form">
        {/*
          A real radio group: each card is the radio's own label, so choosing a
          candidate works with the keyboard and arrow keys, and a screen reader
          announces the group, the name and which one is selected.
        */}
        <fieldset className="candidates-fieldset">
          <legend className="sr-only">Choose one candidate</legend>
          <div className="candidates-grid">
            {candidates.map((candidate) => (
              <label
                key={candidate._id}
                className={`candidate-card ${selectedCandidate === candidate._id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="candidate"
                  value={candidate._id}
                  checked={selectedCandidate === candidate._id}
                  onChange={() => setSelectedCandidate(candidate._id)}
                  className="candidate-radio sr-only"
                />

                <span className="candidate-tick" aria-hidden="true">
                  <Icon name="check" size={15} strokeWidth={3} />
                </span>

                <span className="candidate-image-container">
                  {candidate.image ? (
                    <img src={imageUrl(candidate.image)} alt="" className="candidate-image" />
                  ) : (
                    <span className="candidate-image-placeholder" aria-hidden="true">
                      {candidate.name.charAt(0)}
                    </span>
                  )}
                </span>

                <span className="candidate-details">
                  <span className="candidate-name">{candidate.name}</span>
                  {candidate.party && <span className="candidate-party">{candidate.party}</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="voting-actions">
          <button type="submit" className="btn btn-primary btn-lg vote-button" disabled={!selectedCandidate}>
            <Icon name="ballot" />
            {selectedCandidate ? `Vote for ${chosen.name}` : 'Choose a candidate first'}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="voting-container">
      <div className="voting-header">
        <h2>{election.title}</h2>
        {election.description && <p className="voting-subtitle">{election.description}</p>}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <Icon name="alertCircle" />
          <div>{error}</div>
        </div>
      )}

      {renderBody()}
    </div>
  );
};

export default VotingPage;
