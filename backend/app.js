const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const { normalizeClientAddress } = require('./clientAddress');

//Importing routes
const authRoutes = require('./routes/authRoutes');
const electionRoutes = require('./routes/electionRoutes');
const imageRoutes = require('./routes/imageRoutes');

const app = express();

// The real client address arrives in X-Forwarded-For: from the hosting proxy in
// production (Render and similar), from the React dev server on this machine otherwise
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 'loopback');
app.use(normalizeClientAddress);

app.use(helmet({
  // The React build and the in-browser face model need inline scripts and blob URLs
  contentSecurityPolicy: false
}));
app.use(compression());
// No CORS headers: the frontend is always served from this same address
// Large enough for a shrunken selfie sent as a data URL, small enough to refuse anything bigger
app.use(express.json({ limit: '400kb' }));

//use the routes
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/images', imageRoutes);

// Health check endpoint for the frontend and the hosting platform
app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'unavailable',
    database: connected ? 'connected' : 'disconnected'
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Serve the built frontend in production (anything that is not an API route)
const frontendPath = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Image is too large. Maximum size is 1MB.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request is too large' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid request body' });
  }
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err.name === 'ValidationError') {
    const validationErrors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: 'Validation error', errors: validationErrors });
  }
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
