import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NetworkDiagnostic = () => {
  const [diagnostics, setDiagnostics] = useState({
    running: true,
    results: [],
    summary: 'Running diagnostics...'
  });

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setDiagnostics(prev => ({ ...prev, running: true, results: [] }));
    
    const results = [];
    let serverAvailable = false;
    
    // Test multiple possible backend URLs
    const endpoints = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      window.location.origin + '/api'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${endpoint}/health`, { timeout: 5000 });
        const elapsed = Date.now() - startTime;
        
        results.push({
          endpoint,
          status: 'success',
          statusCode: response.status,
          responseTime: elapsed,
          data: response.data
        });
        
        serverAvailable = true;
        console.log(`✅ Connection to ${endpoint} successful (${elapsed}ms)`);
        // Break on first success
        break;
      } catch (error) {
        let errorDetails = {
          message: error.message
        };
        
        if (error.response) {
          errorDetails.statusCode = error.response.status;
          errorDetails.data = error.response.data;
        }
        
        results.push({
          endpoint,
          status: 'error',
          error: errorDetails
        });
        
        console.log(`❌ Connection to ${endpoint} failed: ${error.message}`);
      }
    }
    
    // Additional environment checks
    const browserInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      online: navigator.onLine
    };
    
    setDiagnostics({
      running: false,
      results,
      serverAvailable,
      browserInfo,
      summary: serverAvailable 
        ? 'Server connection established!' 
        : 'Unable to connect to the server. Please check if the backend is running.'
    });
  };

  const renderResults = () => {
    return (
      <div className="diagnostic-results">
        <h3>Connection Test Results</h3>
        {diagnostics.results.map((result, index) => (
          <div key={index} className={`result-item ${result.status}`}>
            <p><strong>Endpoint:</strong> {result.endpoint}</p>
            {result.status === 'success' ? (
              <>
                <p><strong>Status:</strong> Success ✅</p>
                <p><strong>Response time:</strong> {result.responseTime}ms</p>
              </>
            ) : (
              <>
                <p><strong>Status:</strong> Failed ❌</p>
                <p><strong>Error:</strong> {result.error.message}</p>
              </>
            )}
          </div>
        ))}
        
        <h3>Browser Information</h3>
        {diagnostics.browserInfo && (
          <div className="browser-info">
            <p><strong>User Agent:</strong> {diagnostics.browserInfo.userAgent}</p>
            <p><strong>Platform:</strong> {diagnostics.browserInfo.platform}</p>
            <p><strong>Online Status:</strong> {diagnostics.browserInfo.online ? 'Online ✅' : 'Offline ❌'}</p>
          </div>
        )}
        
        <h3>Troubleshooting Steps</h3>
        <ol>
          <li>Make sure the backend server is running on port 3000</li>
          <li>Check for any firewall or network restrictions</li>
          <li>Try running the backend test server: <code>node connectionTest.js</code></li>
          <li>Ensure MongoDB is running and accessible</li>
          <li>Check browser console for more detailed error messages</li>
        </ol>
      </div>
    );
  };

  return (
    <div className="network-diagnostic">
      <h2>Network Connection Diagnostic</h2>
      <div className="summary-box">
        <p className={diagnostics.serverAvailable ? 'success' : 'error'}>
          {diagnostics.summary}
        </p>
      </div>
      
      <button 
        onClick={runDiagnostics} 
        disabled={diagnostics.running}
        className="diagnostic-button"
      >
        {diagnostics.running ? 'Running Tests...' : 'Run Diagnostics Again'}
      </button>
      
      {!diagnostics.running && renderResults()}
    </div>
  );
};

export default NetworkDiagnostic;
