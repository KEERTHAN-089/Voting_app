const express = require('express');
<<<<<<< HEAD
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const cors = require('cors'); // Add this

const app = express();
const server = http.createServer(app);

// Add CORS middleware BEFORE other middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all requests to help with debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Create WebSocket server
const wss = new WebSocket.Server({
  server,
  path: '/ws'
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  ws.on('message', (message) => {
    console.log('Received:', message);
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
  
  // Send initial message
  ws.send(JSON.stringify({ type: 'connection', status: 'connected' }));
});

// Debug: Print current directory and contents
console.log('Server starting...');
console.log('Current directory:', __dirname);
console.log('Directory contents:');
fs.readdirSync(__dirname).forEach(file => {
  console.log(`- ${file} ${fs.statSync(path.join(__dirname, file)).isDirectory() ? '(dir)' : '(file)'}`);
});

// Create a simple fallback page if no build directory exists
const createFallbackPage = () => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Voting App</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🗳️</text></svg>" />
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #333; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🗳️ Voting Application</h1>
          <p>Welcome to the Secure Voting Platform</p>
          <p>The application is loading...</p>
          <script>
            // Try to connect to WebSocket
            const ws = new WebSocket('wss://' + window.location.host + '/ws');
            ws.onopen = function() {
              console.log('WebSocket connected');
            };
            ws.onerror = function(error) {
              console.log('WebSocket error:', error);
            };
          </script>
        </div>
      </body>
    </html>
  `;
};

// Check for build directory and serve static files
const buildPath = path.resolve(__dirname, './build');
const publicPath = path.resolve(__dirname, './public');

if (fs.existsSync(buildPath)) {
  console.log(`Serving static files from: ${buildPath}`);
  app.use(express.static(buildPath));
} else if (fs.existsSync(publicPath)) {
  console.log(`Serving static files from: ${publicPath}`);
  app.use(express.static(publicPath));
} else {
  console.log('No build or public directory found - serving fallback content');
}

// Handle favicon requests specifically (BEFORE catch-all route)
app.get('/favicon.ico', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🗳️</text></svg>`);
});

// Handle other static assets that might have %PUBLIC_URL% issues
app.get('/%PUBLIC_URL%/*', (req, res) => {
  const actualPath = req.path.replace('/%PUBLIC_URL%', '');
  res.redirect(actualPath);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes (if any)
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Candidates API routes with more detailed error handling and logging
app.get('/api/candidates', (req, res) => {
  console.log('GET /api/candidates called');
  // Mock data for now - replace with actual database calls
  const candidates = [
    {
      id: 1,
      name: 'John Doe',
      party: 'Democratic Party',
      votes: 150,
      image: '/images/john-doe.jpg'
    },
    {
      id: 2,
      name: 'Jane Smith',
      party: 'Republican Party',
      votes: 120,
      image: '/images/jane-smith.jpg'
    },
    {
      id: 3,
      name: 'Bob Johnson',
      party: 'Independent',
      votes: 80,
      image: '/images/bob-johnson.jpg'
    }
  ];
  
  console.log('Sending candidates:', candidates);
  res.json(candidates);
});

app.post('/api/candidates', (req, res) => {
  // Add new candidate - mock implementation
  const newCandidate = {
    id: Date.now(),
    name: req.body.name,
    party: req.body.party,
    votes: 0,
    image: req.body.image || '/images/default-avatar.jpg'
  };
  
  res.status(201).json(newCandidate);
});

app.put('/api/candidates/:id', (req, res) => {
  // Update candidate - mock implementation
  const candidateId = req.params.id;
  const updatedCandidate = {
    id: candidateId,
    name: req.body.name,
    party: req.body.party,
    votes: req.body.votes || 0,
    image: req.body.image
  };
  
  res.json(updatedCandidate);
});

app.delete('/api/candidates/:id', (req, res) => {
  // Delete candidate - mock implementation
  const candidateId = req.params.id;
  res.json({ message: `Candidate ${candidateId} deleted successfully` });
});

app.post('/api/candidates/:id/vote', (req, res) => {
  // Vote for candidate - mock implementation
  const candidateId = req.params.id;
  res.json({ 
    message: `Vote cast for candidate ${candidateId}`,
    success: true 
  });
});

app.get('/api/candidates/vote/count', (req, res) => {
  // Get vote counts - mock implementation
  const voteCounts = [
    { candidateId: 1, name: 'John Doe', votes: 150 },
    { candidateId: 2, name: 'Jane Smith', votes: 120 },
    { candidateId: 3, name: 'Bob Johnson', votes: 80 }
  ];
  
  res.json(voteCounts);
});

// User authentication routes
app.post('/api/user/signup', (req, res) => {
  // Mock signup
  res.json({ 
    message: 'User created successfully',
    token: 'mock-jwt-token'
  });
});

app.post('/api/user/login', (req, res) => {
  // Mock login
  res.json({ 
    message: 'Login successful',
    token: 'mock-jwt-token',
    user: { id: 1, name: 'Test User', role: 'voter' }
  });
});

// Add non-prefixed user authentication routes
app.post('/user/signup', (req, res) => {
  console.log('POST /user/signup called (non-prefixed route)');
  // Mock signup - same as the /api/user/signup endpoint
  res.json({ 
    message: 'User created successfully',
    token: 'mock-jwt-token'
  });
});

app.post('/user/login', (req, res) => {
  console.log('POST /user/login called (non-prefixed route)');
  console.log('Login request body:', req.body);
  // Mock login - same as the /api/user/login endpoint
  res.json({ 
    message: 'Login successful',
    token: 'mock-jwt-token',
    user: { id: 1, name: 'Test User', role: 'voter' }
  });
});

// User profile endpoint
app.get('/user/profile', (req, res) => {
  // Mock implementation
  console.log('GET /user/profile called');
  res.json({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'voter'
  });
});

// User vote status endpoint
app.get('/user/vote/status', (req, res) => {
  // Mock implementation
  console.log('GET /user/vote/status called');
  res.json({
    hasVoted: false,
    votedFor: null,
    canVote: true
  });
});

// Add an election results endpoint
app.get('/election/results', (req, res) => {
  console.log('GET /election/results called');
  
  try {
    // Mock election results data
    const results = [
      { candidateId: 1, name: 'John Doe', party: 'Democratic Party', votes: 150, percentage: 42.85 },
      { candidateId: 2, name: 'Jane Smith', party: 'Republican Party', votes: 120, percentage: 34.29 },
      { candidateId: 3, name: 'Bob Johnson', party: 'Independent', votes: 80, percentage: 22.86 }
    ];
    
    const totalVotes = results.reduce((sum, candidate) => sum + candidate.votes, 0);
    
    res.json({
      results: results,
      totalVotes: totalVotes,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating election results:', error);
    res.status(500).json({ error: 'Failed to retrieve election results' });
  }
});

// Add a non-prefixed route for candidates to be consistent with other endpoints
app.get('/candidates', (req, res) => {
  console.log('GET /candidates called (non-prefixed route)');
  // Mock data for now - same as in the /api/candidates endpoint
  const candidates = [
    {
      id: 1,
      name: 'John Doe',
      party: 'Democratic Party',
      votes: 150,
      image: '/images/john-doe.jpg'
    },
    {
      id: 2,
      name: 'Jane Smith',
      party: 'Republican Party',
      votes: 120,
      image: '/images/jane-smith.jpg'
    },
    {
      id: 3,
      name: 'Bob Johnson',
      party: 'Independent',
      votes: 80,
      image: '/images/bob-johnson.jpg'
    }
  ];
  
  console.log('Sending candidates (non-prefixed route):', candidates);
  res.json(candidates);
});

// Also add non-prefixed routes for other candidate operations
app.post('/candidates', (req, res) => {
  console.log('POST /candidates called (non-prefixed route)');
  const newCandidate = {
    id: Date.now(),
    name: req.body.name,
    party: req.body.party,
    votes: 0,
    image: req.body.image || '/images/default-avatar.jpg'
  };
  res.status(201).json(newCandidate);
});

app.put('/candidates/:id', (req, res) => {
  console.log(`PUT /candidates/${req.params.id} called (non-prefixed route)`);
  const candidateId = req.params.id;
  const updatedCandidate = {
    id: candidateId,
    name: req.body.name,
    party: req.body.party,
    votes: req.body.votes || 0,
    image: req.body.image
  };
  res.json(updatedCandidate);
});

app.delete('/candidates/:id', (req, res) => {
  console.log(`DELETE /candidates/${req.params.id} called (non-prefixed route)`);
  const candidateId = req.params.id;
  res.json({ message: `Candidate ${candidateId} deleted successfully` });
});

app.post('/candidates/:id/vote', (req, res) => {
  console.log(`POST /candidates/${req.params.id}/vote called (non-prefixed route)`);
  const candidateId = req.params.id;
  res.json({ 
    message: `Vote cast for candidate ${candidateId}`,
    success: true 
  });
});

// Also add a non-prefixed route for vote counts to be consistent
app.get('/candidates/vote/count', (req, res) => {
  // Get vote counts - mock implementation
  console.log('GET /candidates/vote/count called');
  const voteCounts = [
    { candidateId: 1, name: 'John Doe', votes: 150 },
    { candidateId: 2, name: 'Jane Smith', votes: 120 },
    { candidateId: 3, name: 'Bob Johnson', votes: 80 }
  ];
  
  res.json(voteCounts);
});

// Catch-all handler for React Router (MUST BE LAST)
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  const publicIndexPath = path.join(publicPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else if (fs.existsSync(publicIndexPath)) {
    res.sendFile(publicIndexPath);
  } else {
    // Send fallback HTML
    res.send(createFallbackPage());
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`WebSocket server available at path /ws`);
});
=======
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const candidateRoutes = require('./routes/candidates');
const userRoutes = require('./routes/users');

// Initialize app
const app = express();

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Atlas connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors({
  origin: 'http://localhost:3001', // Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/candidates', candidateRoutes);
app.use('/user', userRoutes);  // Match the endpoint your frontend is using

// Root route for API health check
app.get('/', (req, res) => {
  res.send('Voting Application API is running');
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  
  // Return detailed error in development, generic message in production
  const error = process.env.NODE_ENV === 'production' 
    ? { message: 'Internal server error' }
    : { message: err.message, stack: err.stack };
  
  res.status(500).json(error);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
>>>>>>> f118baf306327fa3afd0dbdca214b0d55c1f96de
