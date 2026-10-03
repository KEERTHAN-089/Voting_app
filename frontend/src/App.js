import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import './styles/Home.css';
import './styles/Sessions.css';
import './styles/VotingPage.css';
import './styles/Results.css';

// Import components
import Home from './components/Home';
import Login from './components/Login';
import VotingPage from './components/VotingPage';
import Results from './components/Results';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import ElectionForm from './components/ElectionForm';
import ElectionManage from './components/ElectionManage';
import JoinElection from './components/JoinElection';
import RequireAuth from './components/RequireAuth';
import { AuthProvider } from './utils/AuthContext';
import useTheme from './utils/useTheme';

function App() {
  // Held here so the nav toggle and the toasts agree on which theme is showing
  const { resolved, toggle } = useTheme();

  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <a className="skip-link" href="#main">Skip to main content</a>
          <Navbar theme={resolved} onToggleTheme={toggle} />
          <main className="container" id="main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/join/:code" element={<JoinElection />} />
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/create" element={<RequireAuth><ElectionForm /></RequireAuth>} />
              <Route path="/elections/:id/manage" element={<RequireAuth><ElectionManage /></RequireAuth>} />
              <Route path="/elections/:id/vote" element={<RequireAuth><VotingPage /></RequireAuth>} />
              <Route path="/elections/:id/results" element={<RequireAuth><Results /></RequireAuth>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <ToastContainer position="top-right" autoClose={3000} theme={resolved} />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
