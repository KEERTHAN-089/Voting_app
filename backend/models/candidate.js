const mongoose = require('mongoose');

// Define a schema for the votes to ensure proper structure
const voteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  votedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  party: {
    type: String,
    required: true,
    trim: true,
    index: true
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
  // Fix votes array definition to use either ObjectIds or vote objects
  votes: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Add timestamps for better tracking
  timestamps: true,
  // Add toJSON transform to ensure consistent data format
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id; // Add id field that matches _id for API consistency
      return ret;
    },
    virtuals: true
  }
});

// Add a pre-save hook to ensure vote count is always accurate
candidateSchema.pre('save', function(next) {
  try {
    // Ensure votes is an array
    if (!Array.isArray(this.votes)) {
      this.votes = [];
    }
    
    // Update vote count
    this.voteCount = this.votes.length;
    next();
  } catch (error) {
    next(error);
  }
});

// Update the voting route to use consistent vote format
candidateSchema.methods.addVote = function(userId) {
  // Ensure votes is an array
  if (!Array.isArray(this.votes)) {
    this.votes = [];
  }
  
  // Add vote in consistent format
  this.votes.push({
    user: userId,
    votedAt: new Date()
  });
  
  // Update vote count
  this.voteCount = this.votes.length;
  return this;
};

// Check if model exists before creating to prevent OverwriteModelError
const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

module.exports = Candidate;

// This schema defines a Candidate model with fields for name, party, age, and votes.