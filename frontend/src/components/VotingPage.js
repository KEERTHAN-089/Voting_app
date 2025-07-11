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
    // Check if user is authenticated (has token)
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    // First check if the user has already voted
    const checkVoteStatus = async () => {
      try {
        console.log('Checking if user has already voted...');
        const response = await api.get('/user/vote/status');
        console.log('Vote status response:', response.data);
        
        // If hasVoted or isVoted is true, user has already voted
        if (response.data && (response.data.hasVoted === true || response.data.isVoted === true)) {
          console.log('User has already voted');
          setHasVoted(true);
          setLoading(false);
        } else {
          console.log('User has not voted yet, fetching candidates');
          // Only fetch candidates if the user hasn't voted
          fetchCandidates();
        }
      } catch (err) {
        console.error('Error checking vote status:', err);
        // If we can't determine vote status, proceed with fetching candidates
        fetchCandidates();
      }
    };
    
    // Fetch candidates from the database
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the API utility's getCandidates method instead of direct axios call
        const response = await api.getCandidates();
        
        console.log('Candidates data:', response.data);
        setCandidates(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Error fetching candidates:', err);
        setError('Failed to load candidates. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Check vote status first
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
      
      // Submit the vote
      const response = await api.voteForCandidate(selectedCandidate);
      console.log('Vote response:', response.data);
      
      // Update UI state
      setHasVoted(true);
      setVoteSubmitted(true);
      setSuccessMessage('Your vote has been successfully recorded!');
      
      // Record in localStorage as a backup
      localStorage.setItem('hasVoted', 'true');
      localStorage.setItem('votedAt', new Date().toISOString());
      
      // Redirect to results page after delay
      setTimeout(() => {
        navigate('/results');
      }, 3000);
    } catch (err) {
      console.error('Error submitting vote:', err);
      
      // Specific error handling
      if (err.response?.status === 403) {
        setError('You have already cast your vote in this election.');
        setHasVoted(true); // Update UI to reflect voted state
      } else {
        setError(err.response?.data?.message || 'Failed to submit vote. Please try again.');
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
