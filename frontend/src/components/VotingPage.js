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
        const response = await api.get('/user/vote/status');
        if (response.data.hasVoted) {
          setHasVoted(true);
          setLoading(false);
        } else {
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
        const response = await api.get('/candidates');
        console.log('Fetched candidates:', response.data);
        setCandidates(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching candidates:', err);
        setError('Failed to load candidates. Please try again later.');
        setLoading(false);
      }
    };

    // Check vote status first
    checkVoteStatus();
  }, [navigate]);

  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCandidate) {
      setError('Please select a candidate');
      return;
    }

    try {
      // Submit vote using the correct API endpoint from your backend
      const response = await api.post(`/candidates/vote/${selectedCandidate}`);
      console.log('Vote submitted:', response.data);
      setVoteSubmitted(true);
      setTimeout(() => {
        navigate('/results');
      }, 2000);
    } catch (err) {
      console.error('Error submitting vote:', err);
      if (err.response) {
        // If the error indicates the user has already voted
        if (err.response.status === 400 && 
            (err.response.data.message?.includes('already voted') || 
             err.response.data.message?.includes('already cast'))) {
          setHasVoted(true);
        } else {
          setError(err.response.data.message || 'Error submitting vote');
        }
      } else {
        setError('Error submitting vote. Please try again.');
      }
    }
  };

  if (loading) return <div className="loading">Loading candidates...</div>;
  if (voteSubmitted) return <div className="success-message">Vote submitted successfully! Redirecting to results...</div>;
  if (hasVoted) return (
    <div className="voted-container">
      <div className="alert alert-info">
        <h3>You have already cast your vote in this election.</h3>
        <p>Each voter can only vote once. Thank you for participating!</p>
        <button 
          onClick={() => navigate('/results')} 
          className="btn btn-primary mt-3"
        >
          View Election Results
        </button>
      </div>
    </div>
  );

  return (
    <div className="voting-container">
      <h2>Cast Your Vote</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {candidates.length === 0 && !loading ? (
        <div className="alert alert-info">No candidates available for voting at this time.</div>
      ) : (
        <form onSubmit={handleVoteSubmit}>
          <div className="candidates-list">
            {candidates.map(candidate => (
              <div className="candidate-option" key={candidate._id}>
                <div className="candidate-info">
                  <input
                    type="radio"
                    id={candidate._id}
                    name="candidate"
                    value={candidate._id}
                    onChange={() => setSelectedCandidate(candidate._id)}
                    checked={selectedCandidate === candidate._id}
                  />
                  
                  {candidate.imageUrl && (
                    <img 
                      src={candidate.imageUrl} 
                      alt={candidate.name}
                      className="candidate-image"
                    />
                  )}
                  
                  <div className="candidate-details">
                    <label htmlFor={candidate._id}>
                      <strong>{candidate.name}</strong>
                      {candidate.party && <div>{candidate.party}</div>}
                      {candidate.age && <div>Age: {candidate.age}</div>}
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="submit" className="btn btn-success">Submit Vote</button>
        </form>
      )}
    </div>
  );
};

export default VotingPage;
