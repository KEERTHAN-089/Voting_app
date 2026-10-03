const mongoose = require('mongoose');

// One voter's place in one session. It records whether they voted, never who for.
const membershipSchema = new mongoose.Schema({
  election: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedVia: { type: String, enum: ['list', 'organizer'] },
  hasVoted: { type: Boolean, default: false },
  votedAt: { type: Date },
  enrolSelfie: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
  voteSelfie: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
  // Face-match sessions only. Never sent to any client.
  faceDescriptor: { type: [Number], default: undefined, select: false }
}, { timestamps: true });

// One membership per voter per session: this is what makes "one vote each" enforceable
membershipSchema.index({ election: 1, user: 1 }, { unique: true });
membershipSchema.index({ election: 1, status: 1 });
membershipSchema.index({ user: 1 });

const Membership = mongoose.models.Membership || mongoose.model('Membership', membershipSchema);

module.exports = Membership;
