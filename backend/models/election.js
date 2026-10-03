const mongoose = require('mongoose');

const MAX_VOTERS_LIMIT = 5000;

// A voting session. Whoever creates it is its organizer.
const electionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['draft', 'open', 'closed'], default: 'draft' },
  joinCode: { type: String, required: true, unique: true },
  // Approvals stop once approvedCount reaches maxVoters
  maxVoters: { type: Number, required: true, min: 1, max: MAX_VOTERS_LIMIT },
  approvedCount: { type: Number, default: 0 },
  selfieMode: { type: String, enum: ['none', 'photo', 'faceMatch'], default: 'none' },
  resultsVisible: { type: String, enum: ['live', 'afterClose'], default: 'afterClose' },
  // Emails that are approved automatically when they join. Can be large, so it is
  // only loaded when asked for with .select('+allowList').
  allowList: { type: [String], default: [], select: false },
  closedAt: { type: Date }
}, { timestamps: true });

const Election = mongoose.models.Election || mongoose.model('Election', electionSchema);

module.exports = Election;
module.exports.MAX_VOTERS_LIMIT = MAX_VOTERS_LIMIT;
