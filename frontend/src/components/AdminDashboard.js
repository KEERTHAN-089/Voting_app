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
      const response = await api.get('/candidates');
      setCandidates(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError('Failed to load candidates');
      setLoading(false);
    }
  };

  const handleAddCandidate = async (candidateData) => {
    try {
      // Use FormData with proper headers for multipart/form-data
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };
      
      await api.post('/candidates', candidateData, config);
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
      // Use FormData with proper headers for multipart/form-data
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };
      
      await api.put(`/candidates/${id}`, candidateData, config);
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
      await api.delete(`/candidates/${id}`);
      fetchCandidates();
    } catch (err) {
      console.error('Error deleting candidate:', err);
      setError('Failed to delete candidate');
    }
  };

  if (loading) return <div className="loading">Loading admin dashboard...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!isAdmin) return <div className="loading">Checking admin privileges...</div>;

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      
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
          {candidates.length === 0 ? (
            <p>No candidates available.</p>
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
