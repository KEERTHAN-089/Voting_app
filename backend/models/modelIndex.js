/**
 * Centralized model registry to prevent OverwriteModelError
 * This file ensures each model is only registered once with Mongoose
 */
const mongoose = require('mongoose');

// Store registered models
const models = {};

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  age: { type: Number, required: true },
  email: { type: String, required: true, unique: true }, 
  mobile: { type: String, required: true, unique: true },
  address: { type: String, required: true },  
  aadharCardNumber: { type: Number, required: true, unique: true },
  password: { type: String, required: true },  
  role: { type: String, enum: ['admin', 'voter'], default: 'voter' },
  isVoted: { type: Boolean, default: false },
  hasVoted: { type: Boolean, default: false },  // For compatibility
  votedFor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    default: null
  }
});

// Candidate Schema
const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  party: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true
  },
  imageUrl: {
    type: String,
    default: '/default-candidate.jpg'
  },
  voteCount: {
    type: Number,
    default: 0
  },
  votes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Safe model registration function
const getModel = (name, schema) => {
  if (mongoose.models[name]) {
    return mongoose.models[name];
  }
  
  if (models[name]) {
    return models[name];
  }
  
  models[name] = mongoose.model(name, schema);
  return models[name];
};

// Export safe model getters
module.exports = {
  User: getModel('User', userSchema),
  Candidate: getModel('Candidate', candidateSchema)
};
