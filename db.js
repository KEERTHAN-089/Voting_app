const mongoose = require('mongoose');
require('dotenv').config();     
const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting_app';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

module.exports = mongoose;
// This code connects to a MongoDB database using Mongoose.
// It uses the connection string from an environment variable or defaults to a local database.
