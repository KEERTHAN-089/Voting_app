import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const VotingPage = () => {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkVoteStatus = async () => {
      try {
        console.log('Checking if user has already voted...');
        const voteStatus = await api.checkVoteStatus();
        if (voteStatus.hasVoted) {
          setHasVoted(true);
          setLoading(false);
        } else {
          fetchCandidates();
        }
      } catch (err) {
        console.error('Error checking vote status:', err);
        setError('Failed to check vote status. Please try again later.');
        setLoading(false);
      }
    };

    const fetchCandidates = async () => {
      try {
        setLoading(true);
        const response = await api.getCandidates();
        setCandidates(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Error fetching candidates:', err);
        setError('Failed to load candidates. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    checkVoteStatus();
  }, [navigate]);

  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCandidate) {
      setError('Please select a candidate to vote.');
      return;
    }

    try {
      setVoting(true);
      setError('');
      console.log('Submitting vote for candidate:', selectedCandidate);
      const response = await api.voteForCandidate(selectedCandidate);
      setHasVoted(true);
      setVoteSubmitted(true);
      setSuccessMessage('Your vote has been successfully recorded!');
      setTimeout(() => navigate('/results'), 3000);
    } catch (err) {
      console.error('Error submitting vote:', err);
      
      // Enhanced error handling with detailed information
      if (err.response) {
        // Server responded with an error status
        if (err.response.status === 403) {
          setError('You have already cast your vote in this election.');
          setHasVoted(true);
        } else if (err.response.status === 500) {
          console.error('Server error details:', err.response.data);
          setError('Server error. Please try again later or contact support.');
        } else if (err.response.status === 401) {
          setError('Your session has expired. Please log in again.');
          setTimeout(() => navigate('/login'), 2000);
        } else {
          setError(err.response?.data?.message || 'Failed to submit vote. Please try again.');
        }
      } else if (err.request) {
        // Request was made but no response received
        console.error('No response received:', err.request);
        setError('No response from server. Please check your connection and try again.');
      } else {
        // Error setting up the request
        console.error('Request setup error:', err.message);
        setError(`Network error: ${err.message}`);
      }
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="voting-container">
      <div className="voting-header">
        <h2>Cast Your Vote</h2>
        <p className="voting-subtitle">Select your preferred candidate and submit your vote</p>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle mr-2"></i>
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading candidates...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="empty-state">
          <div className="alert alert-info">
            <i className="fas fa-info-circle mr-2"></i>
            No candidates available for voting at this time.
          </div>
        </div>
      ) : (
        <form onSubmit={handleVoteSubmit} className="voting-form">
          <div className="candidates-grid">
            {candidates.map(candidate => (
              <div 
                key={candidate._id} 
                className={`candidate-card ${selectedCandidate === candidate._id ? 'selected' : ''}`}
                onClick={() => setSelectedCandidate(candidate._id)}
              >
                <div className="candidate-selection">
                  <input
                    type="radio"
                    id={candidate._id}
                    name="candidate"
                    value={candidate._id}
                    checked={selectedCandidate === candidate._id}
                    onChange={() => setSelectedCandidate(candidate._id)}
                    className="candidate-radio"
                  />
                  <label htmlFor={candidate._id} className="sr-only">{candidate.name}</label>
                </div>
                
                <div className="candidate-content">
                  <div className="candidate-image-container">
                    {candidate.imageUrl ? (
                      <img 
                        src={candidate.imageUrl} 
                        alt={candidate.name}
                        className="candidate-image"
                      />
                    ) : (
                      <div className="candidate-image-placeholder">
                        {candidate.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  <div className="candidate-details">
                    <h3 className="candidate-name">{candidate.name}</h3>
                    {candidate.party && <div className="candidate-party">{candidate.party}</div>}
                    {candidate.age && <div className="candidate-age">Age: {candidate.age}</div>}
                  </div>
                </div>
                
                {selectedCandidate === candidate._id && (
                  <div className="selection-indicator">
                    <i className="fas fa-check-circle"></i> Selected
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="voting-actions">
            <button 
              type="submit" 
              className="btn btn-primary vote-button"
              disabled={!selectedCandidate || voting}
            >
              {voting ? (
                <>
                  <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-vote-yea mr-2"></i>
                  Submit Vote
                </>
              )}
            </button>
          </div>
        </form>
      )}
      
      {voteSubmitted && (
        <div className="vote-success">
          <div className="check-animation">✓</div>
          <h3>Vote Submitted Successfully!</h3>
          <p>Thank you for participating in the election.</p>
          <p>Redirecting to results page...</p>
        </div>
      )}
      
      {hasVoted && (
        <div className="already-voted">
          <div className="alert alert-info already-voted-alert">
            <div className="already-voted-icon">
              <i className="fas fa-vote-yea fa-3x"></i>
            </div>
            <div className="already-voted-content">
              <h3>You have already cast your vote</h3>
              <p>Each voter can only vote once. Thank you for participating!</p>
              <button 
                onClick={() => navigate('/results')} 
                className="btn btn-primary mt-3"
              >
                <i className="fas fa-chart-bar mr-2"></i>
                View Election Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingPage;
