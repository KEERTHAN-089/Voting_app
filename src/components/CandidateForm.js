import React, { useState } from 'react';
import api from '../api';

const CandidateForm = ({ candidate, onSuccess, resetForm }) => {
  const [name, setName] = useState(candidate ? candidate.name : '');
  const [party, setParty] = useState(candidate ? candidate.party : '');
  const [image, setImage] = useState(candidate ? candidate.image : '');
  const [candidateId] = useState(candidate ? candidate.id : null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Form validation
      if (!name || !party) {
        setError('Please fill in all required fields');
        setSubmitting(false);
        return;
      }
      
      const formData = { name, party, image };
      
      if (candidateId) {
        // Update existing candidate - use updateCandidate instead of put
        const response = await api.updateCandidate(candidateId, formData);
        console.log('Candidate updated successfully', response.data);
      } else {
        // Create new candidate - use createCandidate instead of post
        const response = await api.createCandidate(formData);
        console.log('Candidate created successfully', response.data);
      }
      
      onSuccess();
      resetForm();
    } catch (err) {
      console.error('Error submitting form:', err);
      
      // Show more detailed error information
      if (err.response) {
        setError(`Submission failed: ${err.response.data.message || err.response.statusText}`);
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
      } else if (err.request) {
        setError('Unable to reach server. Please check your connection.');
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <div>
        <label>
          Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Party:
          <input
            type="text"
            value={party}
            onChange={(e) => setParty(e.target.value)}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Image URL:
          <input
            type="text"
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />
        </label>
      </div>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
};

export default CandidateForm;