import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../utils/api';
import usePolling from '../utils/usePolling';
import ResultsBoard from './ResultsBoard';
import { StatusBadge } from './Dashboard';
import Icon from './Icon';

const Results = () => {
  const { id } = useParams();
  const [results, setResults] = useState(null);
  // Set when the organizer chose to show results only after closing
  const [hiddenElection, setHiddenElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stopped, setStopped] = useState(false);

  const fetchResults = useCallback(async () => {
    try {
      const response = await api.get(`/elections/${id}/results`);
      setResults(response.data);
      setHiddenElection(null);
      setError('');
    } catch (err) {
      if (err.response?.data?.hidden) {
        setHiddenElection(err.response.data.election);
        setError('');
      } else {
        console.error('Error fetching results:', err);
        setError(errorMessage(err, 'Failed to load results. Please try again later.'));
        // Not a voter in this session, or it no longer exists: retrying will not help
        if ([403, 404].includes(err.response?.status)) setStopped(true);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Counts keep moving until the session closes; after that there is nothing new to fetch
  const finished = results?.election.status === 'closed';
  usePolling(fetchResults, 5000, !finished && !stopped);

  const election = results?.election || hiddenElection;

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>{election ? election.title : 'Results'}</h2>
        {election && <StatusBadge status={election.status} />}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <Icon name="alertCircle" />
          <div>{error}</div>
        </div>
      )}

      {/* Counts refresh in the background, so announce changes politely. */}
      <div className="results-content" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading results...</p>
          </div>
        ) : hiddenElection ? (
          <div className="alert alert-info">
            <Icon name="clock" />
            <div>Results will be shown when the organizer closes the session. This page will update on its own.</div>
          </div>
        ) : results ? (
          <ResultsBoard results={results} />
        ) : null}
      </div>

      <div className="results-footer">
        <Link to="/dashboard" className="btn btn-secondary">
          <Icon name="arrowLeft" />
          Back to my sessions
        </Link>
      </div>
    </div>
  );
};

export default Results;
