import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import '../styles/HomePage.css';

const HomePage = () => {
  const [stats, setStats] = useState({
    totalVoters: 0,
    totalVotes: 0,
    candidates: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
        
        // Fetch candidates count
        const candidatesResponse = await api.getCandidates();
        const candidates = Array.isArray(candidatesResponse.data) ? 
          candidatesResponse.data : [];
          
        // Fetch vote stats (if you have this endpoint)
        let totalVotes = 0;
        try {
          const voteResults = await api.getResults();
          totalVotes = voteResults.data.reduce((sum, result) => 
            sum + (result.voteCount || 0), 0);
        } catch (err) {
          console.log('Could not fetch vote count');
        }
        
        setStats({
          totalVoters: 0, // You would need an API endpoint for this
          totalVotes,
          candidates: candidates.length
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Democracy in Action</h1>
          <p className="hero-subtitle">Secure, Transparent, and Accessible Voting Platform</p>
          <div className="hero-buttons">
            {isLoggedIn ? (
              <Link to="/vote" className="btn btn-primary hero-btn">
                Cast Your Vote
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary hero-btn">
                  Login to Vote
                </Link>
                <Link to="/register" className="btn btn-outline-primary hero-btn">
                  Register Now
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-image">
          <div className="vote-illustration"></div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-value">{loading ? '...' : stats.candidates}</div>
            <div className="stat-label">Candidates</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-vote-yea"></i>
            </div>
            <div className="stat-value">{loading ? '...' : stats.totalVotes}</div>
            <div className="stat-label">Votes Cast</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-chart-bar"></i>
            </div>
            <Link to="/results" className="stat-action">
              View Results
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Why Vote With Us?</h2>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3>Secure Voting</h3>
            <p>Your vote is protected with end-to-end encryption and blockchain technology.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-mobile-alt"></i>
            </div>
            <h3>Vote Anywhere</h3>
            <p>Cast your vote from anywhere using your computer, tablet, or smartphone.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-chart-pie"></i>
            </div>
            <h3>Real-time Results</h3>
            <p>View election results in real-time as they are being counted.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-user-check"></i>
            </div>
            <h3>Identity Verification</h3>
            <p>Robust identity verification ensures only eligible voters can participate.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <h2 className="section-title">How It Works</h2>
        
        <div className="steps-container">
          <div className="step-item">
            <div className="step-number">1</div>
            <h3>Register</h3>
            <p>Create an account using your Aadhar card and personal details.</p>
          </div>
          
          <div className="step-connector"></div>
          
          <div className="step-item">
            <div className="step-number">2</div>
            <h3>Verify</h3>
            <p>Complete identity verification to ensure electoral integrity.</p>
          </div>
          
          <div className="step-connector"></div>
          
          <div className="step-item">
            <div className="step-number">3</div>
            <h3>Vote</h3>
            <p>Login and cast your vote securely for your preferred candidate.</p>
          </div>
          
          <div className="step-connector"></div>
          
          <div className="step-item">
            <div className="step-number">4</div>
            <h3>Results</h3>
            <p>View election results in real-time as votes are counted.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Make Your Voice Heard?</h2>
          <p>Your vote matters. Join thousands of citizens exercising their democratic right.</p>
          <div className="cta-buttons">
            {isLoggedIn ? (
              <Link to="/vote" className="btn btn-primary cta-btn">
                Vote Now
              </Link>
            ) : (
              <Link to="/register" className="btn btn-primary cta-btn">
                Register to Vote
              </Link>
            )}
            <Link to="/results" className="btn btn-outline-primary cta-btn">
              See Election Results
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
