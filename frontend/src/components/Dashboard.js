import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!storedUser || !token) {
      navigate('/login');
      return;
    }
    
    // Parse stored user data
    try {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      
      // Fetch latest user data from server
      const fetchUserProfile = async () => {
        try {
          const response = await api.getProfile();
          setUser(response.data);
        } catch (err) {
          console.error('Error fetching user profile:', err);
          if (err.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
          }
        } finally {
          setLoading(false);
        }
      };
      
      fetchUserProfile();
    } catch (err) {
      console.error('Error parsing user data:', err);
      setLoading(false);
      setError('Session error. Please login again.');
      setTimeout(() => navigate('/login'), 2000);
    }
  }, [navigate]);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="dashboard">
      <h1>Welcome, {user?.username}!</h1>
      
      <div className="dashboard-info">
        <div className="user-info">
          <h2>Your Information</h2>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.role}</p>
          <p><strong>Voting Status:</strong> {user?.hasVoted ? 'You have voted' : 'You have not voted yet'}</p>
        </div>
        
        <div className="dashboard-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            {!user?.hasVoted && (
              <Link to="/vote" className="btn btn-primary">
                Cast Your Vote
              </Link>
            )}
            
            <Link to="/results" className="btn btn-secondary">
              View Election Results
            </Link>
            
            {user?.role === 'admin' && (
              <Link to="/admin" className="btn btn-danger">
                Admin Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
