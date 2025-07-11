const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
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
    min: 18
  },
  voteCount: {
    type: Number,
    default: 0
  },
  imageUrl: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Candidate', CandidateSchema);
// This schema defines a Candidate model with fields for name, party, age, and votes.