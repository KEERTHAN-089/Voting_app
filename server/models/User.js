const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // ...existing code...
  
  hasVoted: {
    type: Boolean,
    default: false
  },
  votedFor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    default: null
  }
  
  // ...existing code...
});

// ...existing code...

module.exports = mongoose.model('User', UserSchema);