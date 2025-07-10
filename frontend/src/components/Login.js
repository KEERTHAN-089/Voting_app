import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Login = () => {
  const [formData, setFormData] = useState({
    aadharCardNumber: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const { aadharCardNumber, password } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/user/login', {
        aadharCardNumber,
        password
      });
      
      localStorage.setItem('token', response.data.token);
      
      // If your login response includes user role
      if (response.data.user && response.data.user.role === 'admin') {
        navigate('/admin'); // Redirect to admin dashboard
      } else {
        navigate('/vote'); // Regular users go to voting page
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
      console.error(err);
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
        <button type="submit" className="btn btn-primary">Login</button>
      </form>
    </div>
  );
};

export default Login;
