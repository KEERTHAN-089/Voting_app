const mongoose = require('mongoose');

// One pending login code per email. MongoDB removes the document once expiresAt passes.
const otpCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
});

const OtpCode = mongoose.models.OtpCode || mongoose.model('OtpCode', otpCodeSchema);

module.exports = OtpCode;
