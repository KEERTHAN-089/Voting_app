import React from 'react';

const CandidateCard = ({ candidate, onVote }) => {
  return (
    <div className="candidate-card">
      {candidate.imageId && (
        <div className="candidate-image-container">
          <img 
            src={`/api/candidates/image/${candidate.imageId}`}
            alt={candidate.name}
            className="candidate-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/placeholder-profile.png'; // Fallback image
            }}
          />
        </div>
      )}
      
      <div className="candidate-info">
        <h3>{candidate.name}</h3>
        <p className="candidate-party">{candidate.party}</p>
        {candidate.age && <p className="candidate-age">Age: {candidate.age}</p>}
        
        {onVote && (
          <button 
            onClick={() => onVote(candidate._id)} 
            className="btn btn-primary vote-button"
          >
            Vote
          </button>
        )}
      </div>
    </div>
  );
};

export default CandidateCard;
