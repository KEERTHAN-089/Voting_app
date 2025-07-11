import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home-container">
      <h1>Welcome to the Online Voting System</h1>
      <div className="card">
        <p>This secure platform allows eligible citizens to participate in elections electronically.</p>
        <p>Exercise your democratic right by casting your vote for the candidates of your choice.</p>
      </div>

      <div className="features-section">
        <div className="feature-card">
          <h3>Secure Voting</h3>
          <p>Our system ensures the security and integrity of your vote through advanced encryption.</p>
        </div>
        <div className="feature-card">
          <h3>Real-time Results</h3>
          <p>View election results as they come in with our real-time counting system.</p>
        </div>
        <div className="feature-card">
          <h3>Easy Access</h3>
          <p>Vote from anywhere using your Aadhar card authentication.</p>
        </div>
      </div>

      <div className="action-buttons">
        <Link to="/login" className="btn btn-primary">Login to Vote</Link>
        <Link to="/register" className="btn btn-success">Register Now</Link>
        <Link to="/results" className="btn btn-secondary">View Results</Link>
      </div>
    </div>
  );
};

export default Home;
