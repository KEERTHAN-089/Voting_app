import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        setIsLoggedIn(true);
        
        try {
          const response = await api.get('/user/profile');
          setIsAdmin(response.data.role === 'admin');
        } catch (err) {
          console.error('Error checking user role:', err);
        }
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setIsAdmin(false);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <h1>Voting App</h1>
      <ul>
        <li><Link to="/">Home</Link></li>
        
        {!isLoggedIn ? (
          <>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
          </>
        ) : (
          <>
            {isAdmin ? (
              <li><Link to="/admin">Admin Dashboard</Link></li>
            ) : (
              <li><Link to="/vote">Vote</Link></li>
            )}
            <li><Link to="/results">Results</Link></li>
            <li><button onClick={handleLogout} className="btn-link">Logout</button></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
