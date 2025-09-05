import React from 'react';

const CandidateList = ({ candidates }) => {
  // Format date nicely
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate vote percentage
  const calculatePercentage = (candidate, allCandidates) => {
    const totalVotes = allCandidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);
    if (totalVotes === 0) return '0%';
    return `${((candidate.voteCount || 0) / totalVotes * 100).toFixed(1)}%`;
  };

  return (
    <div className="candidate-list">
      {candidates.length === 0 ? (
        <p>No candidates available.</p>
      ) : (
        <div className="candidates-grid">
          {candidates.map(candidate => (
            <div key={candidate._id} className="candidate-card">
              {candidate.imageUrl && (
                <div className="candidate-image">
                  <img src={candidate.imageUrl} alt={candidate.name} />
                </div>
              )}
              <div className="candidate-info">
                <h3>{candidate.name}</h3>
                <p><strong>Party:</strong> {candidate.party}</p>
                {candidate.age && <p><strong>Age:</strong> {candidate.age}</p>}
                <p><strong>Votes:</strong> {candidate.voteCount || 0} ({calculatePercentage(candidate, candidates)})</p>
                {candidate.createdAt && (
                  <p className="candidate-date">Added on {formatDate(candidate.createdAt)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CandidateList;
