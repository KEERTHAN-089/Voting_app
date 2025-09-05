import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-toastify';

const Login = () => {
  const [formData, setFormData] = useState({
    aadharCardNumber: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { aadharCardNumber, password } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      console.log('Submitting login with:', { aadharCardNumber });
      
      // Add connection test before actual login attempt
      try {
        const healthCheck = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/health`);
        if (healthCheck.ok) {
          console.log('Backend server is reachable');
        }
      } catch (healthError) {
        console.warn('Backend health check failed:', healthError.message);
      }
      
      const response = await api.login({ aadharCardNumber, password });
      
      console.log('Login successful:', response.data);
      
      // Store token and user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Show success message and redirect
      toast.success('Login successful!');
      
      // Redirect based on user role
      if (response.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login failed:', err);
      
      // Handle different error types
      if (err.response) {
        // Server responded with error
        if (err.response.status === 401) {
          setError('Invalid credentials. Please check your Aadhar number and password.');
        } else if (err.response.status === 404) {
          setError('Server endpoint not found. Please verify the backend server is running correctly.');
        } else {
          setError(err.response.data?.message || 'Login failed. Please try again later.');
        }
      } else if (err.request) {
        // No response received
        setError(`Cannot connect to server at ${err.config?.baseURL || 'http://localhost:3000'}. Please check if the backend is running and accessible.`);
        console.error('No response received:', err.request);
      } else {
        // Error setting up request
        setError(`Network error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login to Vote</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="aadharCardNumber">Aadhar Card Number</label>
          <input
            type="text"
            id="aadharCardNumber"
            name="aadharCardNumber"
            value={aadharCardNumber}
            onChange={onChange}
            required
            pattern="[0-9]{12}"
            title="Aadhar Card should be 12 digits"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={onChange}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default Login;
