import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import '../styles/Results.css';

const Results = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sortBy, setSortBy] = useState('votes'); // votes or name
  const [animateCharts, setAnimateCharts] = useState(false);
  const refreshInterval = 30000; // 30 seconds
  const navigate = useNavigate();

  // Fetch results from the API
  const fetchResults = async () => {
    try {
      setLoading(true);
      
      // First get all candidates to have their full details
      const candidatesResponse = await api.getCandidates();
      const candidates = Array.isArray(candidatesResponse.data) ? candidatesResponse.data : [];
      
      // Then get vote counts
      const voteCountResponse = await api.getVoteCount();
      let voteCounts = Array.isArray(voteCountResponse.data) ? voteCountResponse.data : [];
      
      // Create a map of parties to candidate details
      const candidateMap = {};
      candidates.forEach(candidate => {
        candidateMap[candidate.party] = {
          name: candidate.name,
          _id: candidate._id,
          party: candidate.party
        };
      });
      
      // Merge vote count data with candidate details
      let processedResults = voteCounts.map(item => {
        const candidateInfo = candidateMap[item.party] || {};
        return {
          _id: candidateInfo._id || item._id || String(Math.random()),
          name: candidateInfo.name || item.name || item.party || "Unknown",
          party: item.party || "Unknown",
          voteCount: item.voteCount || 0
        };
      });
      
      // Sort results
      sortResults(processedResults, sortBy);
      
      // Log the processed results for debugging
      console.log('Processed voting results:', processedResults);
      
      setResults(processedResults);
      setError(null);
      
      // Add slight delay before animation
      setTimeout(() => setAnimateCharts(true), 100);
    } catch (err) {
      console.error('Error fetching results:', err);
      setError('Failed to load election results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Sort results based on criteria
  const sortResults = (data, sortOption) => {
    if (sortOption === 'votes') {
      data.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
    } else if (sortOption === 'name') {
      data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  };

  // Handle sort change
  const handleSortChange = (option) => {
    setSortBy(option);
    setAnimateCharts(false);
    
    // Copy and sort the current results
    const newResults = [...results];
    sortResults(newResults, option);
    setResults(newResults);
    
    // Re-trigger animation after sorting
    setTimeout(() => setAnimateCharts(true), 100);
  };

  useEffect(() => {
    fetchResults();
    
    // Set up auto-refresh if enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchResults, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Calculate total votes
  const totalVotes = results.reduce((sum, result) => sum + (result.voteCount || 0), 0);

  // Get winner information (candidate with most votes)
  const getWinner = () => {
    if (!results.length) return null;
    
    const winner = [...results].sort((a, b) => 
      (b.voteCount || 0) - (a.voteCount || 0)
    )[0];
    
    return winner;
  };

  const winner = getWinner();

  // Render the results
  const renderResults = () => {
    if (results.length === 0) {
      return (
        <div className="no-results">
          <div className="empty-state">
            <i className="fas fa-chart-bar empty-icon"></i>
            <h3>No Votes Yet</h3>
            <p>Be the first one to cast your vote!</p>
            <button className="btn btn-primary" onClick={() => navigate('/vote')}>
              Go to Voting
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="results-cards">
        {results.map((result, index) => {
          const { _id, name, party, voteCount } = result;
          const votes = voteCount || 0;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isWinner = winner && _id === winner._id;
          
          // Determine bar color based on position
          let barColorClass = 'bar-color-default';
          if (index === 0) barColorClass = 'bar-color-first';
          else if (index === 1) barColorClass = 'bar-color-second';
          else if (index === 2) barColorClass = 'bar-color-third';
          
          return (
            <div key={_id} className={`result-card ${isWinner ? 'winner' : ''}`}>
              {isWinner && <div className="winner-badge">Winner</div>}
              
              <div className="result-header">
                <h3 className="candidate-name">{name || party}</h3>
                <div className="candidate-party">{party}</div>
              </div>
              
              <div className="result-stats">
                <div className="vote-percentage">{percentage}%</div>
                <div className="vote-count">{votes} vote{votes !== 1 ? 's' : ''}</div>
              </div>
              
              <div className="chart-container">
                <div 
                  className={`progress-bar ${barColorClass} ${animateCharts ? 'animate' : ''}`}
                  style={{ width: animateCharts ? `${percentage}%` : '0%' }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>Election Results</h2>
        <p className="results-subtitle">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast so far
        </p>
      </div>
      
      <div className="results-controls">
        <div className="control-group">
          <button 
            className="btn btn-primary refresh-btn"
            onClick={fetchResults}
            disabled={loading}
          >
            <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i>
            {loading ? ' Refreshing...' : ' Refresh'}
          </button>
          
          <div className="auto-refresh">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={() => setAutoRefresh(!autoRefresh)}
            />
            <label htmlFor="auto-refresh">Auto-refresh every 30 seconds</label>
          </div>
        </div>
        
        <div className="sort-options">
          <span>Sort by: </span>
          <button 
            className={`sort-btn ${sortBy === 'votes' ? 'active' : ''}`}
            onClick={() => handleSortChange('votes')}
          >
            Most Votes
          </button>
          <button 
            className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
            onClick={() => handleSortChange('name')}
          >
            Name
          </button>
        </div>
      </div>
      
      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}
      
      {winner && totalVotes > 0 && (
        <div className="winner-section">
          <div className="winner-card">
            <div className="trophy-icon">
              <i className="fas fa-trophy"></i>
            </div>
            <div className="winner-info">
              <h3>Current Leader</h3>
              <div className="winner-name">{winner.name} ({winner.party})</div>
              <div className="winner-votes">
                {winner.voteCount || 0} votes ({Math.round(((winner.voteCount || 0) / totalVotes) * 100)}%)
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="results-content">
        {loading && results.length === 0 ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading results...</p>
          </div>
        ) : (
          renderResults()
        )}
      </div>
      
      <div className="results-footer">
        <button 
          className="btn btn-outline-primary vote-btn"
          onClick={() => navigate('/vote')}
        >
          <i className="fas fa-vote-yea"></i> Go to Voting Page
        </button>
      </div>
    </div>
  );
};

export default Results;

