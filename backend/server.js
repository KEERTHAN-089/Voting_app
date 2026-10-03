require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const mailer = require('./mailer');

const PORT = process.env.PORT || 3000;

// MongoDB Connection
const connectDB = async () => {
  // Use MONGODB_URI from .env file
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting_app';
  console.log('Attempting to connect to MongoDB at:', MONGODB_URI.replace(/:([^:@]+)@/, ':****@')); // Hide password in logs

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    // Enough connections for a rush of voters without exhausting a small Atlas tier
    maxPoolSize: Number(process.env.MONGODB_POOL_SIZE) || 50
  });
  console.log('MongoDB connected successfully!');
};

// The pre-2.0 users collection has unique indexes that block new sign-ups
const warnAboutLegacyData = async () => {
  try {
    const indexes = await mongoose.connection.collection('users').indexes();
    if (indexes.some(index => index.name === 'aadharCardNumber_1')) {
      console.warn('WARNING: This database still has data from the old version of the app.');
      console.warn('New users will not be able to sign in until it is cleared. Run: npm run reset-db');
    }
  } catch (error) {
    // The collection does not exist yet on a fresh database
  }
};

const start = async () => {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET environment variable is not set');
    process.exit(1);
  }

  try {
    await connectDB();
  } catch (error) {
    // Exit so the host restarts us, instead of serving requests that can only fail
    console.error('MongoDB connection error:', error);
    if (error.code === 'ENOTFOUND') {
      console.error('\nThe database address in MONGODB_URI (backend/.env) could not be found.');
      console.error('If it is a MongoDB Atlas cluster, it may have been deleted: create a new one and update MONGODB_URI.');
      console.error('To try the app without a database, run: npm run demo');
    }
    console.error('\nThe server is NOT running.');
    process.exit(1);
  }
  await warnAboutLegacyData();

  if (!mailer.smtpConfigured()) {
    console.warn('Email is not set up (SMTP_HOST, SMTP_USER and SMTP_PASS in backend/.env):');
    console.warn('sign-in codes will be printed HERE, in this terminal, instead of being emailed.');
  }

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  server.on('error', (e) => {
    console.error('Server error:', e);
    process.exit(1);
  });

  // Finish in-flight requests before stopping, so a redeploy does not cut off a vote
  const shutdown = () => {
    console.log('Shutting down...');
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start();
