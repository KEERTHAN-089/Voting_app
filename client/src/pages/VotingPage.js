import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import candidateService from '../services/candidateService';

const VotingPage = () => {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const navigate = useNavigate();

  const handleVoteSubmit = async () => {
    if (!selectedCandidate) {
      toast.error('Please select a candidate');
      return;
    }
    
    setIsSubmitting(true);
    try {
      console.log('Submitting vote for candidate:', selectedCandidate);
      const response = await candidateService.voteForCandidate(selectedCandidate);
      setHasVoted(true);
      setIsSubmitting(false);
      toast.success('Your vote has been recorded!');
      navigate('/results');
    } catch (error) {
      setIsSubmitting(false);
      console.error('Error submitting vote:', error);
      
      if (error.response) {
        if (error.response.status === 403) {
          toast.error('You have already voted in this election');
        } else if (error.response.status === 500) {
          toast.error('Server error. Please try again later or contact support.');
        } else {
          toast.error(error.response.data.message || 'Failed to submit vote');
        }
      } else if (error.request) {
        // The request was made but no response was received
        toast.error('No response from server. Please check if the server is running.');
        console.log('No response received:', error.request);
      } else {
        // Something happened in setting up the request
        toast.error(`Network error: ${error.message}`);
      }
    }
  };

  return (
    <div>
      <h1>Voting Page</h1>
      {/* ...existing code for rendering candidates and voting UI... */}
      <button onClick={handleVoteSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Vote'}
      </button>
    </div>
  );
};

export default VotingPage;