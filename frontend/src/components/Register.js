import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api'; // Make sure this import is correct

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    age: '',
    email: '',
    mobile: '',
    address: '',
    aadharCardNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const { username, age, email, mobile, address, aadharCardNumber, password, confirmPassword } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setSubmitting(false);
      return;
    }
    
    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setSubmitting(false);
      return;
    }
    
    // Validate Aadhar card number
    if (aadharCardNumber.length !== 12 || !/^\d+$/.test(aadharCardNumber)) {
      setError('Aadhar Card Number must be exactly 12 digits');
      setSubmitting(false);
      return;
    }
    
    try {
      console.log('Sending request to: /user/signup');
      console.log('Request payload:', {
        ...formData,
        password: '********' // Hide password in logs
      });

      // Use the signup function from the API
      const response = await api.signup(formData);
      
      console.log('Registration successful:', response.data);
      navigate('/login');
    } catch (err) {
      console.error("Error details:", err);
      
      // Handle specific MongoDB duplicate key error
      if (err.response && err.response.status === 400) {
        const errorMsg = err.response?.data?.message || '';
        
        if (errorMsg.includes('duplicate key') || errorMsg.includes('E11000')) {
          // Check which field is duplicated
          if (errorMsg.includes('mobile')) {
            setError('This mobile number is already registered. Please use a different number.');
          } else if (errorMsg.includes('email')) {
            setError('This email address is already registered. Please use a different email.');
          } else if (errorMsg.includes('aadharCardNumber')) {
            setError('This Aadhar Card Number is already registered.');
          } else {
            setError('This account already exists. Please login instead.');
          }
          setSubmitting(false);
          return;
        }
      }
      
      // More detailed error handling
      if (err.response) {
        // The request was made and the server responded with a status code
        console.error("Response data:", err.response.data);
        console.error("Response status:", err.response.status);
        setError(`Error ${err.response.status}: ${err.response.data.message || 'Registration failed'}`);
      } else if (err.request) {
        // The request was made but no response was received
        console.error("No response received:", err.request);
        setError("Server is not responding. Please check if the backend server is running.");
      } else {
        // Something happened in setting up the request
        console.error("Error message:", err.message);
        setError(`Request error: ${err.message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-container">
      <h2>Register to Vote</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={username}
            onChange={onChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="age">Age</label>
          <input
            type="number"
            id="age"
            name="age"
            value={age}
            onChange={onChange}
            required
            min="18"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={onChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="mobile">Mobile Number</label>
          <input
            type="tel"
            id="mobile"
            name="mobile"
            value={mobile}
            onChange={onChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            value={address}
            onChange={onChange}
            required
          />
        </div>

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

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={onChange}
            required
          />
        </div>

        <button type="submit" className="btn btn-success" disabled={submitting}>
          {submitting ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default Register;

