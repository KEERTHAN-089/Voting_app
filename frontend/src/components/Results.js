import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const Results = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(null);
  
  const fetchResults = async () => {
    try {
      setLoading(true);
      // Get vote counts - use the correct endpoint from your API
      const voteCountResponse = await api.get('/candidates/vote/count');
      console.log('Raw vote count data:', voteCountResponse.data);
      
      // Assuming the API returns candidate details with votes
      // If your API returns only vote counts, you'll need to get candidate details separately
      if (voteCountResponse.data && Array.isArray(voteCountResponse.data)) {
        // Sort by vote count (highest first)
        const sortedResults = [...voteCountResponse.data].sort((a, b) => 
          (b.votes || b.count || 0) - (a.votes || a.count || 0)
        );
        
        setResults(sortedResults);
      } else {
        console.error('Unexpected data format:', voteCountResponse.data);
        setError('Invalid data format received from server');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching results:', err);
      setError('Failed to load election results. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchResults();

    // Set up auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchResults, 30000);
    setRefreshInterval(interval);
    
    // Clean up interval on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  // Calculate total votes for percentage calculation
  const totalVotes = results.reduce((sum, candidate) => {
    // Use voteCount from the actual API response
    return sum + (candidate.voteCount || 0);
  }, 0);

  const handleManualRefresh = () => {
    fetchResults();
  };

  if (loading && results.length === 0) return <div className="loading">Loading results...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="results-container">
      <h2>Election Results</h2>
      <div className="results-header">
        <button onClick={handleManualRefresh} className="btn btn-primary refresh-btn">
          Refresh Results
        </button>
        <p className="auto-refresh-notice">Results auto-refresh every 30 seconds</p>
      </div>
      
      {results.length === 0 ? (
        <div className="alert alert-info">No voting data available yet.</div>
      ) : (
        results.map((candidate, index) => {
          // Use voteCount from the actual response
          const votes = candidate.voteCount || 0;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          
          return (
            <div key={index} className="candidate-result">
              <div className="candidate-header">
                {candidate.imageUrl && (
                  <img 
                    src={candidate.imageUrl} 
                    alt={candidate.party || 'Candidate'}
                    className="candidate-image"
                  />
                )}
                <h3>{candidate.party || 'Unknown Party'}</h3>
              </div>
              <div className="result-bar">
                <div 
                  className="result-fill" 
                  style={{ width: `${percentage}%` }}
                >
                  {percentage}%
                </div>
              </div>
              <p>Votes: {votes}</p>
            </div>
          );
        })
      )}
    </div>
  );
};

export default Results;

