const mongoose = require('mongoose');
const crypto = require('crypto');

// An anonymous ballot: it names the session and the candidate, never the voter.
// The id is random instead of time-based and there are no timestamps, so a vote
// cannot be matched to a voter by when it was cast.
const voteSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(crypto.randomBytes(12))
  },
  election: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true }
}, { versionKey: false });

voteSchema.index({ election: 1, candidate: 1 });

const Vote = mongoose.models.Vote || mongoose.model('Vote', voteSchema);

module.exports = Vote;
