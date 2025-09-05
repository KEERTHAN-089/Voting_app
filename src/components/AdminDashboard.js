import React, { useEffect, useState } from 'react';
import { getCandidates } from '../api';

const AdminDashboard = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch candidates from the server
  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching candidates...');
      const response = await getCandidates();
      setCandidates(response.data);
      console.log('Candidates loaded successfully:', response.data);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError('Failed to load candidates. Please try again later.');
      
      // Show detailed error information
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
      } else if (err.request) {
        console.error('No response received. Server might be down.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {loading && <p>Loading candidates...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {candidates.map((candidate) => (
          <li key={candidate.id}>{candidate.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default AdminDashboard;