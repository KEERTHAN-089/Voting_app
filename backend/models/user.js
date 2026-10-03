const mongoose = require('mongoose');

// Sign-in is by emailed one-time code, so a user is just an email and a display name.
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, trim: true, maxlength: 80, default: '' }
}, { timestamps: true });

// Check if model already exists before creating a new one
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
