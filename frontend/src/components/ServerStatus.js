import React, { useState, useEffect } from 'react';

const ServerStatus = () => {
  const [status, setStatus] = useState('checking');

  // Check server status periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('http://localhost:3000/health', {
          mode: 'no-cors',
          timeout: 2000
        });
        setStatus('online');
      } catch (error) {
        console.error('Server connection error:', error);
        setStatus('offline');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (status === 'offline') {
    return (
      <div className="server-status offline">
        <span>⚠️ Server is offline. Please start the backend server.</span>
      </div>
    );
  }
  
  return null; // Don't show anything if server is online or checking
};

export default ServerStatus;
