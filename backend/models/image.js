const mongoose = require('mongoose');

// Small images (candidate photos, selfies) are kept in the database so they
// survive redeploys on hosts without a persistent disk.
const imageSchema = new mongoose.Schema({
  election: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true, index: true },
  // Candidate photos are public; selfies are visible to the session's organizer only
  kind: { type: String, enum: ['candidate', 'selfie'], required: true },
  contentType: { type: String, required: true },
  data: { type: Buffer, required: true }
}, { timestamps: true });

const Image = mongoose.models.Image || mongoose.model('Image', imageSchema);

module.exports = Image;
