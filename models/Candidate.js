const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  party: {
    type: String,
    required: true
  },
  age: {
    type: Number
  },
  imageUrl: {
    type: String,
    default: null
  },
  voteCount: {
    type: Number,
    default: 0
  },
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'uploads.files',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Candidate', candidateSchema);
