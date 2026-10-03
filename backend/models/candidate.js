const mongoose = require('mongoose');

// Vote totals are not kept here. They are counted from the Vote collection, so
// simultaneous votes for one candidate never compete to update the same document.
const candidateSchema = new mongoose.Schema({
  election: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  // Shown as "Group / tagline" in the UI
  party: { type: String, trim: true, maxlength: 120, default: '' },
  image: { type: mongoose.Schema.Types.ObjectId, ref: 'Image', default: null }
}, { timestamps: true });

// Check if model exists before creating to prevent OverwriteModelError
const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

module.exports = Candidate;
