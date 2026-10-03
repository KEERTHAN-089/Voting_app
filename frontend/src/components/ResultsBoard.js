import React from 'react';
import Icon from './Icon';

// Ranks beyond the third all share one neutral colour
const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'];

// Shows vote counts for one session. Used on the voter results page and the organizer's Results tab.
const ResultsBoard = ({ results }) => {
  const { election, candidates, totalVotes, approvedCount } = results;
  const closed = election.status === 'closed';

  const topVotes = candidates.length > 0 ? candidates[0].votes : 0;
  const leaders = candidates.filter((candidate) => candidate.votes === topVotes);
  const tied = leaders.length > 1;
  const turnout = approvedCount > 0 ? Math.round((totalVotes / approvedCount) * 100) : 0;

  return (
    <>
      <div className="results-summary">
        <div className="summary-stat">
          <span className="summary-value">{totalVotes}</span>
          <span className="summary-label">vote{totalVotes !== 1 ? 's' : ''} cast</span>
        </div>
        {approvedCount > 0 && (
          <>
            <div className="summary-stat">
              <span className="summary-value">{approvedCount}</span>
              <span className="summary-label">approved voter{approvedCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="summary-stat">
              <span className="summary-value">{turnout}%</span>
              <span className="summary-label">turnout</span>
            </div>
          </>
        )}
      </div>

      {totalVotes > 0 && (
        <div className="winner-card">
          <div className="trophy-icon" aria-hidden="true">
            <Icon name="trophy" size={26} />
          </div>
          <div className="winner-info">
            <h3>{tied ? (closed ? 'Tie' : 'Tied for the lead') : (closed ? 'Winner' : 'Current leader')}</h3>
            <div className="winner-name">{leaders.map((candidate) => candidate.name).join(' and ')}</div>
            <div className="winner-votes">
              {topVotes} vote{topVotes !== 1 ? 's' : ''}{tied ? ' each' : ''} ({Math.round((topVotes / totalVotes) * 100)}%)
            </div>
          </div>
        </div>
      )}

      {totalVotes === 0 ? (
        <div className="empty-panel">
          <Icon name="barChart" size={30} />
          <h3>No votes yet</h3>
          <p>Counts appear here as soon as the first vote is cast.</p>
        </div>
      ) : (
        <ol className="results-cards">
          {candidates.map((candidate, index) => {
            const percentage = Math.round((candidate.votes / totalVotes) * 100);
            const isLeader = candidate.votes === topVotes;

            return (
              <li key={candidate._id} className={`result-card ${closed && isLeader ? 'winner' : ''}`}>
                {/* The rank is stated as a number as well as a bar colour, so the
                    ordering does not depend on telling the colours apart. */}
                <span className="result-rank" aria-hidden="true">{index + 1}</span>

                <div className="result-body">
                  <div className="result-header">
                    <h3 className="candidate-name">{candidate.name}</h3>
                    {closed && isLeader && (
                      <span className="winner-badge">{tied ? 'Tie' : 'Winner'}</span>
                    )}
                  </div>
                  {candidate.party && <div className="candidate-party">{candidate.party}</div>}

                  <div className="result-stats">
                    <span className="vote-percentage">{percentage}%</span>
                    <span className="vote-count">{candidate.votes} vote{candidate.votes !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Decorative: the same numbers are already in the text above. */}
                  <div className="chart-container" aria-hidden="true">
                    <div
                      className="progress-bar"
                      style={{ width: `${percentage}%`, backgroundColor: SERIES[index] || 'var(--series-rest)' }}
                    ></div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
};

export default ResultsBoard;
