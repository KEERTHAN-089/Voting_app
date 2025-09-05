import React, { useState } from 'react';

const CandidateCard = ({ candidate, onVote }) => {
  const [imageError, setImageError] = useState(false);

  // Function to handle image loading errors
  const handleImageError = () => {
    console.error(`Failed to load image: ${candidate.imageUrl}`);
    setImageError(true);
  };

  // Improved image URL handling with timestamp to prevent caching
  const getImageUrl = () => {
    if (!candidate.imageUrl) return null;

    // Add timestamp to prevent browser caching
    const timestamp = new Date().getTime();

    // Check if it's a relative path and needs the backend URL prepended
    if (candidate.imageUrl.startsWith('/uploads')) {
      // For development environment
      if (process.env.NODE_ENV !== 'production') {
        return `http://localhost:3000${candidate.imageUrl}?t=${timestamp}`;
      }
      // For production environment
      return `${candidate.imageUrl}?t=${timestamp}`;
    }
    
    // For full URLs or other cases
    return `${candidate.imageUrl}?t=${timestamp}`;
  };

  // Add console logging for debugging
  console.log('Image URL for', candidate.name, ':', getImageUrl());

  return (
    <div className="candidate-card">
      <div className="candidate-image">
        {candidate.imageUrl && !imageError ? (
          <img
            src={getImageUrl()}
            alt={candidate.name}
            onError={handleImageError}
          />
        ) : (
          <div className="placeholder-image">
            {candidate.name.charAt(0)}
          </div>
        )}
      </div>
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
