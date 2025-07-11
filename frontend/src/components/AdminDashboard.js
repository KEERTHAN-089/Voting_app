import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import CandidateForm from './CandidateForm';

const AdminDashboard = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated and is an admin
    const checkAdmin = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await api.get('/user/profile');
        if (response.data.role !== 'admin') {
          setError('You do not have admin access');
          setIsAdmin(false);
          setTimeout(() => navigate('/'), 3000);
        } else {
          setIsAdmin(true);
          fetchCandidates();
        }
      } catch (err) {
        console.error('Error verifying admin status:', err);
        setError('Authentication error');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    checkAdmin();
  }, [navigate]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching candidates...');
      const response = await api.getCandidates();
      
      console.log('Candidates response:', response.data);
      setCandidates(Array.isArray(response.data) ? response.data : []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError('Failed to load candidates. Please try again later.');
      setCandidates([]);
      setLoading(false);
    }
  };

  const handleAddCandidate = async (candidateData) => {
    try {
      // Use the updated endpoint
      await api.createCandidate(candidateData);
      fetchCandidates();
      return { success: true };
    } catch (err) {
      console.error('Error adding candidate:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Error adding candidate' 
      };
    }
  };

  const handleUpdateCandidate = async (id, candidateData) => {
    try {
      // Use the updated endpoint
      await api.updateCandidate(id, candidateData);
      setEditingCandidate(null);
      fetchCandidates();
      return { success: true };
    } catch (err) {
      console.error('Error updating candidate:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Error updating candidate' 
      };
    }
  };

  const handleDeleteCandidate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) {
      return;
    }
    
    try {
      // Use the updated endpoint
      await api.deleteCandidate(id);
      fetchCandidates();
    } catch (err) {
      console.error('Error deleting candidate:', err);
      setError('Failed to delete candidate');
    }
  };

  if (loading) return <div className="loading">Loading admin dashboard...</div>;
  if (!isAdmin) return (
    <div className="unauthorized">
      <h2>Unauthorized Access</h2>
      <p>{error || "You don't have administrator privileges."}</p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>
        Return to Home
      </button>
    </div>
  );
  
  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      
      {error && (
        <div className="alert alert-danger">
          {error}
          <button 
            className="btn btn-sm btn-outline-primary ml-3"
            onClick={fetchCandidates}
          >
            Retry
          </button>
        </div>
      )}
      
      <div className="admin-section">
        <h3>Manage Candidates</h3>
        
        {editingCandidate ? (
          <div className="edit-candidate-section">
            <h4>Edit Candidate</h4>
            <CandidateForm 
              initialData={editingCandidate}
              onSubmit={(data) => handleUpdateCandidate(editingCandidate._id, data)}
              onCancel={() => setEditingCandidate(null)}
            />
          </div>
        ) : (
          <div className="add-candidate-section">
            <h4>Add New Candidate</h4>
            <CandidateForm 
              onSubmit={handleAddCandidate}
            />
          </div>
        )}
        
        <div className="candidate-list">
          <h4>Current Candidates</h4>
          <div className="d-flex justify-content-between mb-2">
            <span>{candidates.length} candidates found</span>
            <button 
              className="btn btn-sm btn-outline-secondary" 
              onClick={fetchCandidates}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh List'}
            </button>
          </div>
          
          {candidates.length === 0 ? (
            <div className="alert alert-info">
              No candidates available. {!error ? 'Add your first candidate using the form above.' : ''}
            </div>
          ) : (
            <table className="candidates-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Party</th>
                  <th>Age</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate._id}>
                    <td>
                      {candidate.imageUrl ? (
                        <img 
                          src={candidate.imageUrl} 
                          alt={candidate.name}
                          className="admin-table-image"
                        />
                      ) : (
                        <div className="no-image">No Image</div>
                      )}
                    </td>
                    <td>{candidate.name}</td>
                    <td>{candidate.party}</td>
                    <td>{candidate.age}</td>
                    <td>
                      <button 
                        onClick={() => setEditingCandidate(candidate)}
                        className="btn btn-sm btn-primary mr-2"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteCandidate(candidate._id)}
                        className="btn btn-sm btn-danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
