/**
 * Server Entry Point
 * This file ensures the server is started correctly.
 */

// Import server setup from server.js
const { app, startServer } = require('./server');

// Start the server if this file is run directly
if (require.main === module) {
  console.log('Starting server from index.js...');
  startServer();
}

module.exports = app;
