import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import './styles/VotingPage.css';
import './styles/Results.css';
import './styles/HomePage.css';

// Import components
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import VotingPage from './components/VotingPage';
import Results from './components/Results';
import Navbar from './components/Navbar';
import AdminDashboard from './components/AdminDashboard';
import Dashboard from './components/Dashboard'; // Add this import

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} /> {/* Add this route */}
            <Route path="/vote" element={<VotingPage />} />
            <Route path="/results" element={<Results />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </div>
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </Router>
  );
}

export default App;
