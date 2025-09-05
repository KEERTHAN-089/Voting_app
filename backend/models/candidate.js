const mongoose = require('mongoose');

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

// Add a method to recalculate vote count
candidateSchema.methods.recalculateVoteCount = function() {
  this.voteCount = Array.isArray(this.votes) ? this.votes.length : 0;
  return this.voteCount;
};

// Check if model exists before creating to prevent OverwriteModelError
const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

module.exports = Candidate;
// This schema defines a Candidate model with fields for name, party, age, and votes.